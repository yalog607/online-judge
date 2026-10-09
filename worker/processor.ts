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
} from "@/modules/judge/repo";
import type { JudgeJobResult } from "@/modules/judge/schema";
import { LANGUAGES } from "./languages";
import { InfraError, runInSandbox } from "./sandbox";
import { functionOutputsMatch, outputsMatch } from "./compare";
import { buildFunctionFiles } from "@/modules/problem/harness";
import { parseFunctionSpec } from "@/modules/problem/function-spec";

const COMPILE_TIMEOUT_MS = 10000;
const COMPILE_MEMORY_MB = 512;
const LOST_CLAIM_ERROR = 50090;

const VERDICT_PRIORITY = ["TLE", "MLE", "RE", "WA"] as const;

type Outcome = { result: string; passedCases: string };

async function judgeSubmission(
  submission: ClaimedSubmission,
  workerId: string,
): Promise<Outcome> {
  const lang = LANGUAGES[submission.Language];
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `itoj-${submission.SubmissionID}-`));
  const finish = async (
    result: string,
    passedCases: string,
    extra: { runtime?: number | null; results?: Parameters<typeof saveResult>[0]["results"] } = {},
  ): Promise<Outcome> => {
    await saveResult({
      submissionId: submission.SubmissionID,
      workerId,
      result,
      runtime: extra.runtime ?? null,
      memory: null,
      passedCases,
      results: extra.results ?? [],
    });
    return { result, passedCases };
  };

  try {
    if (!lang) return await finish("IE", "0/0");

    // Function-mode problems wrap the student's code with a generated driver that reads
    // stdin, calls the function and prints the result; stdin-mode problems run it as is.
    const spec = submission.JudgeMode === "function" ? parseFunctionSpec(submission.FunctionSpec) : null;
    if (submission.JudgeMode === "function" && !spec) return await finish("IE", "0/0");
    const files = spec
      ? buildFunctionFiles(submission.Language, spec, submission.SourceCode)
      : { [lang.sourceFile]: submission.SourceCode };
    if (!files) return await finish("IE", "0/0");
    for (const [name, content] of Object.entries(files)) {
      await fs.writeFile(path.join(dir, name), content, "utf8");
    }
    await fs.chmod(dir, 0o777).catch(() => {});

    const compileCmd = (spec && lang.functionCompile) || lang.compile;
    if (compileCmd) {
      const compileResult = await runInSandbox({
        image: lang.image,
        hostDir: dir,
        cmd: compileCmd,
        stdin: "",
        timeoutMs: lang.compileTimeoutMs ?? COMPILE_TIMEOUT_MS,
        memoryMb: COMPILE_MEMORY_MB,
      });
      if (compileResult.exitCode !== 0 || compileResult.timedOut) return await finish("CE", "0/0");
    }

    const testcases = await listTestcases(submission.ProblemID);
    const results: { testCaseId: number; verdict: string; runtime: number; memory: number }[] = [];
    let maxRuntime = 0;
    let passed = 0;

    for (const tc of testcases) {
      const run = await runInSandbox({
        image: lang.image,
        hostDir: dir,
        cmd: lang.run,
        stdin: tc.InputData,
        timeoutMs: submission.TimeLimit,
        memoryMb: submission.MemoryLimit,
      });

      let verdict: string;
      if (run.timedOut) verdict = "TLE";
      else if (run.oomKilled) verdict = "MLE";
      else if (run.exitCode !== 0) verdict = "RE";
      else if (
        spec
          ? functionOutputsMatch(run.stdout, tc.ExpectedOutput, spec.returns)
          : outputsMatch(run.stdout, tc.ExpectedOutput)
      )
        verdict = "AC";
      else verdict = "WA";

      if (verdict === "AC") passed++;
      maxRuntime = Math.max(maxRuntime, run.wallTimeMs);
      results.push({ testCaseId: tc.TestCaseID, verdict, runtime: run.wallTimeMs, memory: 0 });
    }

    const overall =
      VERDICT_PRIORITY.find((v) => results.some((r) => r.verdict === v)) ??
      (results.length > 0 ? "AC" : "IE");

    return await finish(overall, `${passed}/${results.length}`, { runtime: maxRuntime, results });
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
): Promise<JudgeJobResult> {
  const { submissionId } = job;
  const submission = await claimSubmission(submissionId, workerId);
  if (!submission) return { submissionId, result: "skipped" };

  try {
    const outcome = await judgeSubmission(submission, workerId);
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
      return { submissionId, result: "IE" };
    }
    await releaseSubmission(submissionId, workerId).catch(() => {});
    throw e;
  }
}
