import "dotenv/config";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { claimNext, heartbeat, listTestcases, saveResult } from "@/modules/judge/repo";
import { LANGUAGES } from "./languages";
import { runInSandbox } from "./sandbox";
import { outputsMatch } from "./compare";

const WORKER_ID = `${os.hostname()}-${process.pid}`;
const POLL_IDLE_MS = 1500;
const HEARTBEAT_MS = 10000;
const COMPILE_TIMEOUT_MS = 10000;
const COMPILE_MEMORY_MB = 512;

const VERDICT_PRIORITY = ["TLE", "MLE", "RE", "WA"] as const;

async function judgeSubmission(submission: Awaited<ReturnType<typeof claimNext>>) {
  if (!submission) return;
  const lang = LANGUAGES[submission.Language];
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `itoj-${submission.SubmissionID}-`));

  try {
    if (!lang) {
      await saveResult({
        submissionId: submission.SubmissionID,
        result: "IE",
        runtime: null,
        memory: null,
        passedCases: "0/0",
        results: [],
      });
      return;
    }

    await fs.writeFile(path.join(dir, lang.sourceFile), submission.SourceCode, "utf8");
    await fs.chmod(dir, 0o777).catch(() => {});

    if (lang.compile) {
      const compileResult = await runInSandbox({
        image: lang.image,
        hostDir: dir,
        cmd: lang.compile,
        stdin: "",
        timeoutMs: COMPILE_TIMEOUT_MS,
        memoryMb: COMPILE_MEMORY_MB,
      });
      if (compileResult.exitCode !== 0 || compileResult.timedOut) {
        await saveResult({
          submissionId: submission.SubmissionID,
          result: "CE",
          runtime: null,
          memory: null,
          passedCases: "0/0",
          results: [],
        });
        return;
      }
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
      else if (outputsMatch(run.stdout, tc.ExpectedOutput)) verdict = "AC";
      else verdict = "WA";

      if (verdict === "AC") passed++;
      maxRuntime = Math.max(maxRuntime, run.wallTimeMs);
      results.push({ testCaseId: tc.TestCaseID, verdict, runtime: run.wallTimeMs, memory: 0 });
    }

    const overall =
      VERDICT_PRIORITY.find((v) => results.some((r) => r.verdict === v)) ??
      (results.length > 0 ? "AC" : "IE");

    await saveResult({
      submissionId: submission.SubmissionID,
      result: overall,
      runtime: maxRuntime,
      memory: null,
      passedCases: `${passed}/${results.length}`,
      results,
    });
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function main() {
  console.log(`itoj-worker ${WORKER_ID} started`);
  setInterval(() => {
    heartbeat(WORKER_ID).catch((e) => console.error("heartbeat failed", e));
  }, HEARTBEAT_MS);

  for (;;) {
    try {
      const submission = await claimNext(WORKER_ID);
      if (!submission) {
        await new Promise((r) => setTimeout(r, POLL_IDLE_MS));
        continue;
      }
      console.log(`judging submission ${submission.SubmissionID}`);
      await judgeSubmission(submission);
    } catch (e) {
      console.error("worker loop error", e);
      await new Promise((r) => setTimeout(r, POLL_IDLE_MS));
    }
  }
}

main();
