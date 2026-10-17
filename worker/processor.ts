import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { DomainError } from "@/db/exec";
import {
  claimSubmission,
  listTestcases,
  releaseSubmission,
  saveResult,
  type ClaimedSubmission,
  type TestcaseResult,
} from "@/modules/judge/repo";
import type { JudgeJobResult } from "@/modules/judge/schema";
import { LANGUAGES } from "./languages";
import { InfraError, prepareWorkDir, runInSandbox } from "./sandbox";
import { notifyJudgeResult } from "@/modules/notification/events";
import { functionOutputsMatch } from "./compare";
import { buildFunctionFiles } from "@/modules/problem/harness";
import { parseFunctionSpec } from "@/modules/problem/function-spec";

const COMPILE_TIMEOUT_MS = 10000;
const COMPILE_MEMORY_MB = 512;
const LOST_CLAIM_ERROR = 50090;

// The container is killed only when wall time passes this multiple of the limit plus a fixed
// allowance for `docker run` start-up; it is a safety net for programs that sleep or block.
// The TLE verdict itself is based on CPU time measured inside the container.
const WALL_TIMEOUT_FACTOR = 2;
const WALL_TIMEOUT_OVERHEAD_MS = 2000;

const VERDICT_PRIORITY = ["TLE", "MLE", "RE", "WA"] as const;

export const wallTimeoutMs = (timeLimitMs: number, startupMs = 0) =>
  timeLimitMs * WALL_TIMEOUT_FACTOR + startupMs + WALL_TIMEOUT_OVERHEAD_MS;

// CPU time charged to the submission: container CPU minus the runtime's own start-up cost.
// Falls back to wall time when the host does not expose cgroup counters.
export const chargedTimeMs = (
  run: { cpuTimeMs: number | null; wallTimeMs: number },
  startupMs = 0,
) => Math.max(0, (run.cpuTimeMs ?? run.wallTimeMs) - startupMs);

const BYTES_PER_MB = 1024 * 1024;
export const toMegabytes = (bytes: number | null) =>
  bytes === null ? null : Math.round((bytes / BYTES_PER_MB) * 10) / 10;

export type EarlyStopMode = "off" | "priority" | "first-failure";

// Whether the remaining testcases can be skipped after `verdict`. "priority" only stops on the
// verdict that VERDICT_PRIORITY ranks first, so the final verdict equals that of a full run.
export function shouldStopEarly(mode: EarlyStopMode, verdict: string): boolean {
  if (mode === "off" || verdict === "AC") return false;
  return mode === "first-failure" || verdict === VERDICT_PRIORITY[0];
}

type Outcome = { result: string; passedCases: string };

async function judgeSubmission(
  submission: ClaimedSubmission,
  workerId: string,
  earlyStop: EarlyStopMode,
): Promise<Outcome> {
  const lang = LANGUAGES[submission.Language];
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `itoj-${submission.SubmissionID}-`));
  const finish = async (
    result: string,
    passedCases: string,
    extra: {
      runtime?: number | null;
      memory?: number | null;
      results?: Parameters<typeof saveResult>[0]["results"];
    } = {},
  ): Promise<Outcome> => {
    await saveResult({
      submissionId: submission.SubmissionID,
      workerId,
      result,
      runtime: extra.runtime ?? null,
      memory: extra.memory ?? null,
      passedCases,
      results: extra.results ?? [],
    });
    await notifyJudgeResult(submission.SubmissionID, result, passedCases);
    return { result, passedCases };
  };

  try {
    if (!lang) return await finish("IE", "0/0");

    // Every problem is judged by function: the student's code is wrapped with a generated
    // driver that reads the testcase from stdin, calls the function and prints the result.
    // A problem without a valid signature cannot be judged, which is a system issue (IE).
    const spec = parseFunctionSpec(submission.FunctionSpec);
    if (!spec) return await finish("IE", "0/0");
    const files = buildFunctionFiles(submission.Language, spec, submission.SourceCode);
    if (!files) return await finish("IE", "0/0");
    for (const [name, content] of Object.entries(files)) {
      await fs.writeFile(path.join(dir, name), content, "utf8");
    }
    const user = await prepareWorkDir(dir);

    if (lang.compile) {
      const compileResult = await runInSandbox({
        image: lang.image,
        hostDir: dir,
        cmd: lang.compile,
        stdin: "",
        timeoutMs: lang.compileTimeoutMs ?? COMPILE_TIMEOUT_MS,
        memoryMb: COMPILE_MEMORY_MB,
        writable: true,
        user,
      });
      if (compileResult.exitCode !== 0 || compileResult.timedOut) return await finish("CE", "0/0");
    }

    const startupMs = lang.startupMs ?? 0;
    const testcases = await listTestcases(submission.ProblemID);
    const results: TestcaseResult[] = [];
    let maxRuntime = 0;
    let maxMemory: number | null = null;
    let passed = 0;

    for (const tc of testcases) {
      const run = await runInSandbox({
        image: lang.image,
        hostDir: dir,
        cmd: lang.run,
        stdin: tc.InputData,
        timeoutMs: wallTimeoutMs(submission.TimeLimit, startupMs),
        memoryMb: submission.MemoryLimit,
        measure: true,
        user,
      });
      const runtime = chargedTimeMs(run, startupMs);
      const memory = toMegabytes(run.memoryBytes);

      let verdict: string;
      if (run.timedOut || runtime > submission.TimeLimit) verdict = "TLE";
      else if (run.oomKilled) verdict = "MLE";
      else if (run.exitCode !== 0) verdict = "RE";
      else if (functionOutputsMatch(run.stdout, tc.ExpectedOutput, spec.returns)) verdict = "AC";
      else verdict = "WA";

      if (verdict === "AC") passed++;
      maxRuntime = Math.max(maxRuntime, runtime);
      if (memory !== null) maxMemory = Math.max(maxMemory ?? 0, memory);
      results.push({ testCaseId: tc.TestCaseID, verdict, runtime, memory });
      // Skipped testcases are neither run nor stored; they still count in the total below.
      if (shouldStopEarly(earlyStop, verdict)) break;
    }

    const overall =
      VERDICT_PRIORITY.find((v) => results.some((r) => r.verdict === v)) ??
      (results.length > 0 ? "AC" : "IE");

    return await finish(overall, `${passed}/${testcases.length}`, { runtime: maxRuntime, memory: maxMemory, results });
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// Processes one queue job. Infrastructure/unexpected errors hand the submission back to
// the queue and throw so BullMQ retries; on the last attempt the submission becomes `IE`
// (never `RE`/`CE`, which are verdicts about the user's code).
export async function judgeJob(
  job: { submissionId: number; attempt: number; maxAttempts: number },
  workerId: string,
  options: { earlyStop?: EarlyStopMode } = {},
): Promise<JudgeJobResult> {
  const { submissionId } = job;
  const submission = await claimSubmission(submissionId, workerId);
  if (!submission) return { submissionId, result: "skipped" };

  try {
    const outcome = await judgeSubmission(submission, workerId, options.earlyStop ?? "off");
    return { submissionId, result: outcome.result };
  } catch (e) {
    if (e instanceof DomainError && e.code === LOST_CLAIM_ERROR) {
      return { submissionId, result: "skipped" };
    }
    const kind = e instanceof InfraError ? "infrastructure" : "unexpected";
    console.error(`judge ${kind} error for submission ${submissionId}`, e);

    if (job.attempt >= job.maxAttempts) {
      await saveResult({
        submissionId,
        workerId,
        result: "IE",
        runtime: null,
        memory: null,
        passedCases: "0/0",
        results: [],
      });
      await notifyJudgeResult(submissionId, "IE", "0/0");
      return { submissionId, result: "IE" };
    }
    await releaseSubmission(submissionId, workerId).catch(() => {});
    throw e;
  }
}
