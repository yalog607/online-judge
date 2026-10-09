import { z } from "zod";

export const createContestSchema = z
  .object({
    contestName: z.string().trim().min(1, "Tên kỳ thi không được để trống").max(200),
    description: z.string().trim().optional().nullable(),
    startTime: z.string().min(1, "Vui lòng chọn thời gian bắt đầu"),
    endTime: z.string().min(1, "Vui lòng chọn thời gian kết thúc"),
    password: z.string().trim().optional().nullable(),
    classId: z.coerce.number().int().positive().optional().nullable(),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu",
    path: ["endTime"],
  });

export const updateContestSchema = z
  .object({
    contestName: z.string().trim().min(1, "Tên kỳ thi không được để trống").max(200),
    description: z.string().trim().optional().nullable(),
    startTime: z.string().min(1, "Vui lòng chọn thời gian bắt đầu"),
    endTime: z.string().min(1, "Vui lòng chọn thời gian kết thúc"),
    password: z.string().trim().optional().nullable(),
    classId: z.coerce.number().int().positive().optional().nullable(),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu",
    path: ["endTime"],
  });

export const addContestProblemSchema = z.object({
  problemId: z.coerce.number().int().positive("Vui lòng chọn bài tập"),
  maxScore: z.coerce.number().int().min(1, "Điểm tối đa phải lớn hơn 0").default(100),
  orderIndex: z.coerce.number().int().min(0).default(0),
});

export const joinContestSchema = z.object({
  password: z.string().trim().optional().nullable(),
});

export const contestFilterSchema = z.object({
  status: z.enum(["Upcoming", "Ongoing", "Ended", "All"]).default("All"),
  classId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.coerce.number().int().positive().optional(),
  onlyMine: z.boolean().optional(),
});

export type CreateContestInput = z.infer<typeof createContestSchema>;
export type UpdateContestInput = z.infer<typeof updateContestSchema>;
export type AddContestProblemInput = z.infer<typeof addContestProblemSchema>;
export type JoinContestInput = z.infer<typeof joinContestSchema>;
export type ContestFilterInput = z.infer<typeof contestFilterSchema>;

export interface ContestOverview {
  contestId: number;
  creatorId: number;
  creatorName: string;
  creatorUsername: string;
  contestName: string;
  description: string | null;
  startTime: string;
  endTime: string;
  classId: number | null;
  className: string | null;
  isProtected: boolean;
  status: "Upcoming" | "Ongoing" | "Ended";
  problemCount: number;
  participantCount: number;
  createdAt: string;
  isJoined?: boolean;
}

export interface ContestProblem {
  problemId: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  timeLimit: number;
  memoryLimit: number;
  maxScore: number;
  orderIndex: number;
  solved: boolean;
  wrongCount: number;
  solveMinute: number | null;
}

export interface ContestLeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  fullName: string;
  avatar: string | null;
  totalScore: number;
  penaltyTime: number;
  problemsSolved: number;
}
