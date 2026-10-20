import { execProc } from "@/db/exec";
import type { Language } from "@/modules/submission/repo";

export type ClaimedSubmission = {
  SubmissionID: number;
  ProblemID: number;
  SourceCode: string;
  Language: Language;
  TimeLimit: number;
  MemoryLimit: number;
  FunctionSpec: string | null;
};

export type JudgeTestcase = {
  TestCaseID: number;
  InputData: string;
  ExpectedOutput: string;
  GroupNo: number | null;
};

export type JudgeChecker = {
  CompareMode: "exact" | "unordered" | "float";
  FloatEpsilon: number | null;
};
export type JudgeGroup = { GroupNo: number; Points: number };

export type TestcaseResult = {
  testCaseId: number;
  verdict: string;
  runtime: number;
  // Peak memory in MB; null when the host could not measure it.
  memory: number | null;
};

export async function claimSubmission(
  submissionId: number,
  workerId: string,
): Promise<ClaimedSubmission | null> {
  const { rows } = await execProc<ClaimedSubmission>("usp_Judge_Claim", {
    SubmissionID: submissionId,
    WorkerID: workerId,
  });
  return rows[0] ?? null;
}

export async function releaseSubmission(submissionId: number, workerId: string) {
  await execProc("usp_Judge_Release", { SubmissionID: submissionId, WorkerID: workerId });
}

export async function requeueStale(staleSeconds: number): Promise<number[]> {
  const { rows } = await execProc<{ SubmissionID: number }>("usp_Judge_RequeueStale", {
    StaleSeconds: staleSeconds,
  });
  return rows.map((r) => r.SubmissionID);
}

export async function listTestcases(problemId: number): Promise<JudgeTestcase[]> {
  const { rows } = await execProc<JudgeTestcase>("usp_Testcase_ListForJudge", {
    ProblemID: problemId,
  });
  return rows;
}

export async function getChecker(problemId: number): Promise<JudgeChecker> {
  const { rows } = await execProc<JudgeChecker>("usp_Judge_GetChecker", { ProblemID: problemId });
  return rows[0] ?? { CompareMode: "exact", FloatEpsilon: null };
}

export async function listGroups(problemId: number): Promise<JudgeGroup[]> {
  const { rows } = await execProc<JudgeGroup>("usp_Judge_ListGroups", { ProblemID: problemId });
  return rows;
}

export async function saveResult(input: {
  submissionId: number;
  workerId: string;
  result: string;
  runtime: number | null;
  memory: number | null;
  passedCases: string;
  results: TestcaseResult[];
  score?: number | null;
  maxScore?: number | null;
}) {
  await execProc("usp_Judge_SaveResult", {
    SubmissionID: input.submissionId,
    Result: input.result,
    Runtime: input.runtime,
    Memory: input.memory,
    PassedCases: input.passedCases,
    ResultsJson: JSON.stringify(input.results),
    WorkerID: input.workerId,
    Score: input.score ?? null,
    MaxScore: input.maxScore ?? null,
  });
}

export async function heartbeat(workerId: string) {
  await execProc("usp_Judge_Heartbeat", { WorkerID: workerId });
}

// Resets the latest submission of every user for a problem to `Pending` (used after its
// testcases changed) and returns their ids so the caller can enqueue them.
export async function requestProblemRejudge(problemId: number): Promise<number[]> {
  const { rows } = await execProc<{ SubmissionID: number }>("usp_Judge_RejudgeProblemLatest", {
    ProblemID: problemId,
  });
  return rows.map((r) => r.SubmissionID);
}
