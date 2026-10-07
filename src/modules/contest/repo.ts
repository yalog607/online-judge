import "server-only";
import { execProc } from "@/db/exec";
import {
  CreateContestInput,
  UpdateContestInput,
  AddContestProblemInput,
  ContestFilterInput,
  ContestOverview,
  ContestProblem,
  ContestLeaderboardEntry,
} from "./schema";

interface ContestDbRow {
  ContestID: number;
  CreatorID: number;
  CreatorName: string;
  CreatorUsername: string;
  ContestName: string;
  Description: string | null;
  StartTime: Date | string;
  EndTime: Date | string;
  ClassID: number | null;
  ClassName: string | null;
  IsProtected: boolean;
  Status: "Upcoming" | "Ongoing" | "Ended";
  ProblemCount: number;
  ParticipantCount: number;
  CreatedAt: Date | string;
  IsJoined?: boolean;
  TotalCount?: number;
}

interface ContestProblemDbRow {
  ProblemID: number;
  Title: string;
  Difficulty: "Easy" | "Medium" | "Hard";
  TimeLimit: number;
  MemoryLimit: number;
  MaxScore: number;
  OrderIndex: number;
  Solved: boolean;
  WrongCount: number;
  SolveMinute: number | null;
}

interface ContestLeaderboardDbRow {
  Rank: number;
  UserID: number;
  Username: string;
  FullName: string;
  Avatar: string | null;
  TotalScore: number;
  PenaltyTime: number;
  ProblemsSolved: number;
}

function mapContestRow(row: ContestDbRow): ContestOverview {
  return {
    contestId: row.ContestID,
    creatorId: row.CreatorID,
    creatorName: row.CreatorName,
    creatorUsername: row.CreatorUsername,
    contestName: row.ContestName,
    description: row.Description,
    startTime: typeof row.StartTime === "string" ? row.StartTime : row.StartTime.toISOString(),
    endTime: typeof row.EndTime === "string" ? row.EndTime : row.EndTime.toISOString(),
    classId: row.ClassID,
    className: row.ClassName,
    isProtected: Boolean(row.IsProtected),
    status: row.Status,
    problemCount: row.ProblemCount,
    participantCount: row.ParticipantCount,
    createdAt: typeof row.CreatedAt === "string" ? row.CreatedAt : row.CreatedAt.toISOString(),
    isJoined: row.IsJoined !== undefined ? Boolean(row.IsJoined) : undefined,
  };
}

export interface IContestRepository {
  createContest(creatorId: number, input: CreateContestInput): Promise<{ contestId: number }>;
  updateContest(contestId: number, requesterId: number, input: UpdateContestInput): Promise<void>;
  getContest(contestId: number, requesterId?: number): Promise<ContestOverview | null>;
  listContests(filter: ContestFilterInput): Promise<{ items: ContestOverview[]; total: number }>;
  addProblem(contestId: number, requesterId: number, input: AddContestProblemInput): Promise<void>;
  removeProblem(contestId: number, problemId: number, requesterId: number): Promise<void>;
  listProblems(contestId: number, requesterId: number): Promise<ContestProblem[]>;
  joinContest(contestId: number, userId: number, password?: string | null): Promise<void>;
  getLeaderboard(contestId: number): Promise<ContestLeaderboardEntry[]>;
  startContestNow(contestId: number, requesterId: number, durationMinutes: number): Promise<void>;
  checkProblemAccess(contestId: number, problemId: number, userId: number): Promise<boolean>;
}

export class ContestRepository implements IContestRepository {
  async createContest(creatorId: number, input: CreateContestInput): Promise<{ contestId: number }> {
    const { rows } = await execProc<{ ContestID: number }>("usp_Contest_Create", {
      CreatorID: creatorId,
      ContestName: input.contestName,
      Description: input.description ?? null,
      StartTime: new Date(input.startTime),
      EndTime: new Date(input.endTime),
      Password: input.password ?? null,
      ClassID: input.classId ?? null,
    });
    return { contestId: rows[0].ContestID };
  }

  async updateContest(
    contestId: number,
    requesterId: number,
    input: UpdateContestInput
  ): Promise<void> {
    await execProc("usp_Contest_Update", {
      ContestID: contestId,
      RequesterID: requesterId,
      ContestName: input.contestName,
      Description: input.description ?? null,
      StartTime: new Date(input.startTime),
      EndTime: new Date(input.endTime),
      Password: input.password ?? null,
      ClassID: input.classId ?? null,
    });
  }

  async getContest(contestId: number, requesterId?: number): Promise<ContestOverview | null> {
    const { rows } = await execProc<ContestDbRow>("usp_Contest_Get", {
      ContestID: contestId,
      RequesterID: requesterId ?? null,
    });
    if (!rows[0]) return null;
    return mapContestRow(rows[0]);
  }

  async listContests(
    filter: ContestFilterInput
  ): Promise<{ items: ContestOverview[]; total: number }> {
    const { rows } = await execProc<ContestDbRow>("usp_Contest_List", {
      Status: filter.status,
      ClassID: filter.classId ?? null,
      Search: filter.search ?? null,
      Page: filter.page,
      PageSize: filter.pageSize,
    });
    const total = rows[0]?.TotalCount ?? 0;
    return {
      items: rows.map(mapContestRow),
      total,
    };
  }

  async addProblem(
    contestId: number,
    requesterId: number,
    input: AddContestProblemInput
  ): Promise<void> {
    await execProc("usp_Contest_AddProblem", {
      ContestID: contestId,
      ProblemID: input.problemId,
      RequesterID: requesterId,
      MaxScore: input.maxScore,
      OrderIndex: input.orderIndex,
    });
  }

  async removeProblem(
    contestId: number,
    problemId: number,
    requesterId: number
  ): Promise<void> {
    await execProc("usp_Contest_RemoveProblem", {
      ContestID: contestId,
      ProblemID: problemId,
      RequesterID: requesterId,
    });
  }

  async listProblems(contestId: number, requesterId: number): Promise<ContestProblem[]> {
    const { rows } = await execProc<ContestProblemDbRow>("usp_Contest_ListProblems", {
      ContestID: contestId,
      RequesterID: requesterId,
    });
    return rows.map((r) => ({
      problemId: r.ProblemID,
      title: r.Title,
      difficulty: r.Difficulty,
      timeLimit: r.TimeLimit,
      memoryLimit: r.MemoryLimit,
      maxScore: r.MaxScore,
      orderIndex: r.OrderIndex,
      solved: Boolean(r.Solved),
      wrongCount: r.WrongCount,
      solveMinute: r.SolveMinute,
    }));
  }

  async joinContest(
    contestId: number,
    userId: number,
    password?: string | null
  ): Promise<void> {
    await execProc("usp_Contest_Join", {
      ContestID: contestId,
      UserID: userId,
      Password: password ?? null,
    });
  }

  async getLeaderboard(contestId: number): Promise<ContestLeaderboardEntry[]> {
    const { rows } = await execProc<ContestLeaderboardDbRow>("usp_Contest_GetLeaderboard", {
      ContestID: contestId,
    });
    return rows.map((r) => ({
      rank: r.Rank,
      userId: r.UserID,
      username: r.Username,
      fullName: r.FullName,
      avatar: r.Avatar,
      totalScore: r.TotalScore,
      penaltyTime: r.PenaltyTime,
      problemsSolved: r.ProblemsSolved,
    }));
  }

  async startContestNow(
    contestId: number,
    requesterId: number,
    durationMinutes: number
  ): Promise<void> {
    await execProc("usp_Contest_StartNow", {
      ContestID: contestId,
      RequesterID: requesterId,
      DurationMinutes: durationMinutes,
    });
  }

  async checkProblemAccess(
    contestId: number,
    problemId: number,
    userId: number
  ): Promise<boolean> {
    const { rows } = await execProc<{ CanAccess: boolean }>("usp_Contest_CheckProblemAccess", {
      ContestID: contestId,
      ProblemID: problemId,
      UserID: userId,
    });
    return Boolean(rows[0]?.CanAccess);
  }
}

export const contestRepository: IContestRepository = new ContestRepository();
