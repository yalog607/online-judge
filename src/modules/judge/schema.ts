import { z } from "zod";

export const JUDGE_QUEUE = "judge";

// The job carries only the id: source code and testcases are read from SQL Server by the worker.
export const judgeJobSchema = z.object({
  submissionId: z.number().int().positive(),
});

export type JudgeJobData = z.infer<typeof judgeJobSchema>;

export type JudgeJobResult = { submissionId: number; result: string };

// BullMQ rejects purely numeric custom ids, hence the prefix.
export const judgeJobId = (submissionId: number) => `submission-${submissionId}`;
