import { z } from "zod";

export const addContestCommentSchema = z.object({
  contestId: z.coerce.number().int().positive(),
  parentId: z.coerce.number().int().positive().optional(),
  content: z.string().trim().min(1, "Nội dung không được để trống").max(2000, "Tối đa 2000 ký tự"),
});
