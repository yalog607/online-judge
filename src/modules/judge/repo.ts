import { execProc } from "@/db/exec";
import type { Language } from "@/modules/submission/repo";

export type ClaimedSubmission = {
  SubmissionID: number;
  ProblemID: number;
  SourceCode: string;
  Language: Language;
  TimeLimit: number;
  MemoryLimit: number;
};

export type JudgeTestcase = { TestCaseID: number; InputData: string; ExpectedOutput: string };

export type TestcaseResult = {
  testCaseId: number;
  verdict: string;
  runtime: number;
  memory: number;
};

export async function claimNext(workerId: string): Promise<ClaimedSubmission | null> {
  const { rows } = await execProc<ClaimedSubmission>("usp_Judge_ClaimNext", { WorkerID: workerId });
  return rows[0] ?? null;
}

export async function listTestcases(problemId: number): Promise<JudgeTestcase[]> {
  const { rows } = await execProc<JudgeTestcase>("usp_Testcase_ListForJudge", {
    ProblemID: problemId,
  });
  return rows;
}

export async function saveResult(input: {
  submissionId: number;
  result: string;
  runtime: number | null;
  memory: number | null;
  passedCases: string;
  results: TestcaseResult[];
}) {
  await execProc("usp_Judge_SaveResult", {
    SubmissionID: input.submissionId,
    Result: input.result,
    Runtime: input.runtime,
    Memory: input.memory,
    PassedCases: input.passedCases,
    ResultsJson: JSON.stringify(input.results),
  });
}

export async function heartbeat(workerId: string) {
  await execProc("usp_Judge_Heartbeat", { WorkerID: workerId });
}
