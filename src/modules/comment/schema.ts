import { z } from "zod";

export const addCommentSchema = z.object({
  problemId: z.coerce.number().int().positive(),
  parentId: z.coerce.number().int().positive().optional(),
  content: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập nội dung bình luận")
    .max(2000, "Bình luận tối đa 2000 ký tự"),
});
