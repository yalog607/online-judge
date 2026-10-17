import "server-only";
import { execProc } from "@/db/exec";
import type { Scoring } from "./schema";

export type Difficulty = "Easy" | "Medium" | "Hard";
export type ProblemStatus = "Public" | "Private" | "Hidden" | "Pending" | "Rejected";

export type ProblemListRow = {
  ProblemID: number;
  Title: string;
  Tags: string | null;
  Difficulty: Difficulty;
  Status: ProblemStatus;
  ProposedStatus?: "Public" | "Private" | null;
  CreatorID: number;
  CreatorFullName?: string | null;
  AcRate: number;
  UserStatus: "done" | "tried" | "todo";
  ClassName?: string;
  TotalCount: number;
};

export type ManageProblemRow = {
  ProblemID: number;
  CreatorID: number;
  CreatorFullName?: string | null;
  Title: string;
  Tags: string | null;
  Difficulty: Difficulty;
  Status: ProblemStatus;
  ProposedStatus: "Public" | "Private" | null;
  CreatedAt: string;
  ClassID: number | null;
  ClassName: string | null;
  CanManage: boolean;
  TotalCount: number;
};

export type ProblemDetail = {
  ProblemID: number;
  CreatorID: number;
  CreatorFullName: string;
  Title: string;
  Statement: string;
  InputFormat: string | null;
  OutputFormat: string | null;
  TimeLimit: number;
  MemoryLimit: number;
  Tags: string | null;
  Difficulty: Difficulty;
  Status: ProblemStatus;
  ProposedStatus: "Public" | "Private" | null;
  RejectionReason: string | null;
  // Signature of the function students implement; null for legacy problems not yet configured.
  FunctionSpec: string | null;
  ClassID?: number | null;
  ClassName?: string | null;
  TeacherID?: number | null;
};

export type TestcasePublic = { TestCaseID: number; InputData: string; ExpectedOutput: string };
export type TestcaseFull = TestcasePublic & { IsHidden: boolean; OrderIndex: number };

export async function listForUser(input: {
  userId: number;
  search?: string;
  tag?: string;
  difficulty?: Difficulty;
  userStatus?: "done" | "tried" | "todo";
  problemStatus?: ProblemStatus;
  page: number;
  pageSize: number;
  ownerOnly?: boolean;
}) {
  const { rows } = await execProc<ProblemListRow>("usp_Problem_ListForUser", {
    UserID: input.userId,
    Search: input.search ?? null,
    Tag: input.tag ?? null,
    Difficulty: input.difficulty ?? null,
    UserStatus: input.userStatus ?? null,
    ProblemStatus: input.problemStatus ?? null,
    Page: input.page,
    PageSize: input.pageSize,
    OwnerOnly: input.ownerOnly ? 1 : 0,
  });
  return { rows, total: rows[0]?.TotalCount ?? 0 };
}

export async function listForManage(input: {
  actorId: number;
  search?: string;
  tag?: string;
  difficulty?: Difficulty;
  status?: ProblemStatus;
  page: number;
  pageSize: number;
  ownerOnly?: boolean;
}) {
  const { rows } = await execProc<ManageProblemRow>("usp_Problem_ListForManage", {
    ActorID: input.actorId,
    Search: input.search ?? null,
    Tag: input.tag ?? null,
    Difficulty: input.difficulty ?? null,
    Status: input.status ?? null,
    Page: input.page,
    PageSize: input.pageSize,
    OwnerOnly: input.ownerOnly ? 1 : 0,
  });
  return { rows, total: rows[0]?.TotalCount ?? 0 };
}

export async function getProblem(problemId: number): Promise<ProblemDetail | null> {
  const { rows } = await execProc<ProblemDetail>("usp_Problem_Get", { ProblemID: problemId });
  return rows[0] ?? null;
}

export async function canTAEditProblem(problemId: number, taId: number): Promise<boolean> {
  const { rows } = await execProc<{ CanEdit: boolean }>("usp_Problem_CanTAEdit", {
    ProblemID: problemId,
    TAID: taId,
  });
  return Boolean(rows[0]?.CanEdit);
}

export async function createProblem(input: {
  creatorId: number;
  title: string;
  statement: string;
  inputFormat?: string;
  outputFormat?: string;
  timeLimit: number;
  memoryLimit: number;
  tags?: string;
  difficulty: Difficulty;
  status?: ProblemStatus;
  proposedStatus?: "Public" | "Private";
  classId?: number;
  dueDate?: string | null;
  functionSpec?: string | null;
}): Promise<number> {
  const { rows } = await execProc<{ ProblemID: number }>("usp_Problem_Create", {
    CreatorID: input.creatorId,
    Title: input.title,
    Statement: input.statement,
    InputFormat: input.inputFormat ?? null,
    OutputFormat: input.outputFormat ?? null,
    TimeLimit: input.timeLimit,
    MemoryLimit: input.memoryLimit,
    Tags: input.tags ?? null,
    Difficulty: input.difficulty,
    Status: input.status ?? "Public",
    ProposedStatus: input.proposedStatus ?? null,
    ClassID: input.classId ?? null,
    DueDate: input.dueDate ? new Date(input.dueDate) : null,
    FunctionSpec: input.functionSpec ?? null,
  });
  return rows[0].ProblemID;
}

export async function updateProblem(input: {
  problemId: number;
  actorId: number;
  title: string;
  statement: string;
  inputFormat?: string;
  outputFormat?: string;
  timeLimit: number;
  memoryLimit: number;
  tags?: string;
  difficulty: Difficulty;
  status?: ProblemStatus;
  proposedStatus?: "Public" | "Private";
  needsReview?: boolean;
  functionSpec?: string | null;
}) {
  await execProc("usp_Problem_Update", {
    ProblemID: input.problemId,
    ActorID: input.actorId,
    Title: input.title,
    Statement: input.statement,
    InputFormat: input.inputFormat ?? null,
    OutputFormat: input.outputFormat ?? null,
    TimeLimit: input.timeLimit,
    MemoryLimit: input.memoryLimit,
    Tags: input.tags ?? null,
    Difficulty: input.difficulty,
    Status: input.status ?? null,
    ProposedStatus: input.proposedStatus ?? null,
    NeedsReview: input.needsReview ? 1 : 0,
    FunctionSpec: input.functionSpec ?? null,
  });
}

export async function setProblemStatus(problemId: number, actorId: number, status: ProblemStatus, rejectionReason?: string) {
  await execProc("usp_Problem_SetStatus", {
    ProblemID: problemId,
    ActorID: actorId,
    Status: status,
    RejectionReason: rejectionReason ?? null,
  });
}

export async function deleteProblem(problemId: number, actorId: number) {
  await execProc("usp_Problem_Delete", { ProblemID: problemId, ActorID: actorId });
}

export async function listPublicTestcases(problemId: number): Promise<TestcasePublic[]> {
  const { rows } = await execProc<TestcasePublic>("usp_Testcase_ListPublic", {
    ProblemID: problemId,
  });
  return rows;
}

export async function listOwnerTestcases(
  problemId: number,
  actorId: number,
): Promise<TestcaseFull[]> {
  const { rows } = await execProc<TestcaseFull>("usp_Testcase_ListForOwner", {
    ProblemID: problemId,
    ActorID: actorId,
  });
  return rows;
}

export async function replaceTestcases(
  problemId: number,
  actorId: number,
  testcases: { input: string; expectedOutput: string; isHidden: boolean; groupNo?: number }[],
  scoring?: Scoring,
) {
  await execProc("usp_Testcase_ReplaceAll", {
    ProblemID: problemId,
    ActorID: actorId,
    TestcasesJson: JSON.stringify(testcases),
    ...(scoring ? { ScoringJson: JSON.stringify(scoring) } : {}),
  });
}

export async function checkProblemAccess(problemId: number, userId: number): Promise<boolean> {
  const { rows } = await execProc<{ CanAccess: boolean }>("usp_Problem_CheckAccess", {
    ProblemID: problemId,
    UserID: userId,
  });
  return Boolean(rows[0]?.CanAccess);
}

export type ClonedProblemResult = {
  ProblemID: number;
  Title: string;
  Difficulty: Difficulty;
  Status: ProblemStatus;
  CreatedAt: string;
};

export async function cloneProblem(
  problemId: number,
  actorId: number,
  newTitle?: string,
): Promise<ClonedProblemResult> {
  const { rows } = await execProc<ClonedProblemResult>("usp_Problem_Clone", {
    ProblemID: problemId,
    ActorID: actorId,
    NewTitle: newTitle ?? null,
  });
  if (!rows[0]) {
    throw new Error("Failed to clone problem");
  }
  return rows[0];
}

export type ProblemSubmissionSummary = {
  TotalSubmissions: number;
  SolvedUsers: number;
  AttemptedUsers: number;
  AcRate: number;
};

export type ProblemSubmissionItem = {
  SubmissionID: number;
  UserID: number;
  Username: string;
  FullName: string;
  Language: string;
  Result: string;
  Runtime: number | null;
  Memory: number | null;
  PassedCases: number;
  SubmitTime: string | Date;
  TotalCount: number;
};

export type ProblemSubmissionsData = {
  summary: ProblemSubmissionSummary;
  items: ProblemSubmissionItem[];
  total: number;
};

export async function getProblemSubmissions(
  problemId: number,
  actorId: number,
  page: number = 1,
  pageSize: number = 20,
  result?: string,
): Promise<ProblemSubmissionsData> {
  const res = await execProc<unknown>("usp_Problem_GetSubmissions", {
    ProblemID: problemId,
    ActorID: actorId,
    Result: result ?? null,
    Page: page,
    PageSize: pageSize,
  });

  const summary = (res.sets[0]?.[0] as ProblemSubmissionSummary) ?? {
    TotalSubmissions: 0,
    SolvedUsers: 0,
    AttemptedUsers: 0,
    AcRate: 0,
  };
  const items = (res.sets[1] ?? []) as ProblemSubmissionItem[];
  const total = items[0]?.TotalCount ?? 0;

  return { summary, items, total };
}

