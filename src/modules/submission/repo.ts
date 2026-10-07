import "server-only";
import { execProc } from "@/db/exec";

export type Language = "cpp" | "c" | "java" | "python" | "javascript" | "go" | "csharp";
export type Verdict = "AC" | "WA" | "TLE" | "MLE" | "RE" | "CE" | "IE";
export type SubmissionStatus = "Pending" | "Judging" | Verdict;

export type SubmissionListRow = {
  SubmissionID: number;
  Language: Language;
  Result: SubmissionStatus;
  Runtime: number | null;
  Memory: number | null;
  PassedCases: string | null;
  SubmitTime: string;
  TotalCount: number;
};

export type SubmissionDetail = {
  SubmissionID: number;
  UserID: number;
  ProblemID: number;
  ProblemTitle: string;
  SourceCode: string;
  Language: Language;
  SubmitTime: string;
  Result: SubmissionStatus;
  Runtime: number | null;
  Memory: number | null;
  PassedCases: string | null;
};

export type SubmissionTestcaseResult = {
  TestCaseID: number;
  Verdict: Verdict;
  Runtime: number | null;
  Memory: number | null;
  IsHidden: boolean;
};

export async function createSubmission(input: {
  userId: number;
  problemId: number;
  language: Language;
  sourceCode: string;
  contestId?: number;
}): Promise<number> {
  const { rows } = await execProc<{ SubmissionID: number }>("usp_Submission_Create", {
    UserID: input.userId,
    ProblemID: input.problemId,
    Language: input.language,
    SourceCode: input.sourceCode,
    ContestID: input.contestId ?? null,
  });
  return rows[0].SubmissionID;
}

export async function listForUser(
  userId: number,
  problemId: number,
  page: number,
  pageSize: number,
) {
  const { rows } = await execProc<SubmissionListRow>("usp_Submission_ListForUser", {
    UserID: userId,
    ProblemID: problemId,
    Page: page,
    PageSize: pageSize,
  });
  return { rows, total: rows[0]?.TotalCount ?? 0 };
}

export async function getSubmission(submissionId: number, requesterId: number) {
  const { sets } = await execProc<SubmissionDetail | SubmissionTestcaseResult>(
    "usp_Submission_Get",
    {
      SubmissionID: submissionId,
      RequesterID: requesterId,
    },
  );
  const [detailRows, testcaseRows] = sets as [SubmissionDetail[], SubmissionTestcaseResult[]];
  return { detail: detailRows[0] ?? null, testcases: testcaseRows ?? [] };
}
