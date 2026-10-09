import "server-only";
import { execProc } from "@/db/exec";

export type Difficulty = "Easy" | "Medium" | "Hard";
export type ProblemStatus = "Public" | "Private" | "Hidden" | "Pending" | "Rejected";
export type JudgeMode = "stdin" | "function";

export type ProblemListRow = {
  ProblemID: number;
  Title: string;
  Tags: string | null;
  Difficulty: Difficulty;
  Status: ProblemStatus;
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
  CreatedAt: string;
  ClassID: number | null;
  ClassName: string | null;
  TotalCount: number;
};

export type ProblemDetail = {
  ProblemID: number;
  CreatorID: number;
  Title: string;
  Statement: string;
  InputFormat: string | null;
  OutputFormat: string | null;
  TimeLimit: number;
  MemoryLimit: number;
  Tags: string | null;
  Difficulty: Difficulty;
  Status: ProblemStatus;
  RejectionReason: string | null;
  JudgeMode: JudgeMode;
  FunctionSpec: string | null;
};

export type TestcasePublic = { TestCaseID: number; InputData: string; ExpectedOutput: string };
export type TestcaseFull = TestcasePublic & { IsHidden: boolean; OrderIndex: number };

export async function listForUser(input: {
  userId: number;
  search?: string;
  tag?: string;
  difficulty?: Difficulty;
  userStatus?: "done" | "tried" | "todo";
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
  classId?: number;
  dueDate?: string | null;
  judgeMode?: JudgeMode;
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
    ClassID: input.classId ?? null,
    DueDate: input.dueDate ? new Date(input.dueDate) : null,
    JudgeMode: input.judgeMode ?? "stdin",
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
  judgeMode?: JudgeMode;
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
    JudgeMode: input.judgeMode ?? null,
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
  testcases: { input: string; expectedOutput: string; isHidden: boolean }[],
) {
  await execProc("usp_Testcase_ReplaceAll", {
    ProblemID: problemId,
    ActorID: actorId,
    TestcasesJson: JSON.stringify(testcases),
  });
}

export async function checkProblemAccess(problemId: number, userId: number): Promise<boolean> {
  const { rows } = await execProc<{ CanAccess: boolean }>("usp_Problem_CheckAccess", {
    ProblemID: problemId,
    UserID: userId,
  });
  return Boolean(rows[0]?.CanAccess);
}
