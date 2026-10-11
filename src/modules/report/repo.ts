import "server-only";
import { execProc } from "@/db/exec";

export type ClassSummaryRow = {
  ClassID: number;
  ClassName: string;
  TeacherName: string;
  TotalStudents: number;
  TotalProblems: number;
  TotalSubmissions: number;
  TotalAC: number;
  TotalWA: number;
  TotalTLE: number;
  TotalMLE: number;
  TotalRE: number;
  TotalCE: number;
  TotalFailed: number;
  PassRatePercent: number;
};

export type ClassProblemRow = {
  ProblemID: number;
  Title: string;
  Difficulty: string;
  TotalSubmissions: number;
  TotalAC: number;
  TotalFailed: number;
  PassRatePercent: number;
  SolvedStudentCount: number;
};

export type ClassStudentRow = {
  UserID: number;
  FullName: string;
  Username: string;
  Email: string;
  ProgressPercent: number;
  TotalSubmissions: number;
  TotalAC: number;
  TotalFailed: number;
  ProblemsSolved: number;
  PassRatePercent: number;
};

export type ContestSummaryRow = {
  ContestID: number;
  ContestName: string;
  StartTime: string;
  EndTime: string;
  TotalParticipants: number;
  TotalProblems: number;
  TotalSubmissions: number;
  TotalAC: number;
  TotalWA: number;
  TotalTLE: number;
  TotalMLE: number;
  TotalRE: number;
  TotalCE: number;
  TotalFailed: number;
  PassRatePercent: number;
};

export type ContestProblemRow = {
  ProblemID: number;
  Title: string;
  MaxScore: number;
  TotalSubmissions: number;
  TotalAC: number;
  TotalFailed: number;
  PassRatePercent: number;
  SolvedParticipantCount: number;
};

export type ContestParticipantRow = {
  UserID: number;
  FullName: string;
  Username: string;
  Email: string;
  TotalScore: number;
  PenaltyTime: number;
  TotalSubmissions: number;
  TotalAC: number;
  TotalFailed: number;
  ProblemsSolved: number;
  PassRatePercent: number;
};

export async function getClassStats(actorId: number, classId: number) {
  const res = await execProc<unknown>("usp_Report_GetClassStats", {
    ActorID: actorId,
    ClassID: classId,
  });

  const summary = (res.sets[0]?.[0] as ClassSummaryRow | undefined) ?? null;
  const problems = (res.sets[1] as ClassProblemRow[] | undefined) ?? [];
  const students = (res.sets[2] as ClassStudentRow[] | undefined) ?? [];

  return { summary, problems, students };
}

export async function getContestStats(actorId: number, contestId: number) {
  const res = await execProc<unknown>("usp_Report_GetContestStats", {
    ActorID: actorId,
    ContestID: contestId,
  });

  const summary = (res.sets[0]?.[0] as ContestSummaryRow | undefined) ?? null;
  const problems = (res.sets[1] as ContestProblemRow[] | undefined) ?? [];
  const participants = (res.sets[2] as ContestParticipantRow[] | undefined) ?? [];

  return { summary, problems, participants };
}

export type ClassOptionRow = {
  ClassID: number;
  ClassName: string;
  TeacherName: string;
  ApprovalStatus?: string;
  StudentCount?: number;
  ProblemCount?: number;
};

export type ContestOptionRow = {
  ContestID: number;
  ContestName: string;
  CreatorName?: string;
  Status: string;
  ParticipantCount?: number;
  ProblemCount?: number;
};

export async function listClassesForReport(actorId: number): Promise<ClassOptionRow[]> {
  const { rows } = await execProc<ClassOptionRow>("usp_Report_ListClasses", {
    ActorID: actorId,
  });
  return rows;
}

export async function listContestsForReport(actorId: number): Promise<ContestOptionRow[]> {
  const { rows } = await execProc<ContestOptionRow>("usp_Report_ListContests", {
    ActorID: actorId,
  });
  return rows;
}

