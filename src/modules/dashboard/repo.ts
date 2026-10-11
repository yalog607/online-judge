import "server-only";
import { execProc } from "@/db/exec";

export type UserDashboardSummary = {
  ProblemsSolved: number;
  SolvedThisWeek: number;
  TotalSubmissions: number;
  TotalAC: number;
  CurrentStreak: number;
  LongestStreak: number;
  Rank: number | null;
  RankedUsers: number;
  Today: string;
};

export type ActivityDay = { Day: string; Cnt: number };

export type UpcomingContestRow = {
  ContestID: number;
  ContestName: string;
  StartTime: Date;
  EndTime: Date;
  ProblemCount: number;
  IsProtected: boolean;
  Status: "Ongoing" | "Upcoming";
};

export type TeacherDashboardSummary = {
  ClassCount: number;
  StudentCount: number;
  OpenProblems: number;
  ExpiringSoon: number;
  SubmissionsToday: number;
  SubmissionsYesterday: number;
  PendingClasses: number;
  PendingProblems: number;
  PendingTaRequests: number;
  Today: string;
};

export type TeacherRecentSubmission = {
  SubmissionID: number;
  FullName: string;
  ProblemTitle: string;
  Result: string;
  SubmitTime: Date;
};

export type TeacherClassProgress = {
  ClassID: number;
  ClassName: string;
  StudentCount: number;
  AvgProgress: number;
  NextDue: Date | null;
};

export type AdminDashboardSummary = {
  TotalUsers: number;
  NewUsersToday: number;
  Submissions24h: number;
  SubmissionsPrev24h: number;
  QueueCount: number;
  WorkersTotal: number;
  WorkersActive: number;
  Errors24h: number;
};

export type AdminHourBucket = { Idx: number; StartHour: number; Cnt: number };
export type AdminLanguageRow = { Language: string; Cnt: number };
export type AdminAuditRow = {
  AuditID: number;
  Action: string;
  TargetType: string;
  TargetID: number | null;
  Detail: string | null;
  CreatedAt: Date;
  ActorName: string;
  TargetName: string | null;
};

export async function getUserDashboard(userId: number) {
  const res = await execProc<unknown>("usp_Dashboard_User", { UserID: userId });
  return {
    summary: res.sets[0]?.[0] as UserDashboardSummary,
    activity: (res.sets[1] ?? []) as ActivityDay[],
    contest: (res.sets[2]?.[0] as UpcomingContestRow | undefined) ?? null,
  };
}

export async function getTeacherDashboard(teacherId: number) {
  const res = await execProc<unknown>("usp_Dashboard_Teacher", { TeacherID: teacherId });
  return {
    summary: res.sets[0]?.[0] as TeacherDashboardSummary,
    daily: (res.sets[1] ?? []) as ActivityDay[],
    recent: (res.sets[2] ?? []) as TeacherRecentSubmission[],
    classes: (res.sets[3] ?? []) as TeacherClassProgress[],
  };
}

export async function getAdminDashboard() {
  const res = await execProc<unknown>("usp_Dashboard_Admin");
  return {
    summary: res.sets[0]?.[0] as AdminDashboardSummary,
    hours: (res.sets[1] ?? []) as AdminHourBucket[],
    languages: (res.sets[2] ?? []) as AdminLanguageRow[],
    audit: (res.sets[3] ?? []) as AdminAuditRow[],
  };
}
