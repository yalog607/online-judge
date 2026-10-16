import { z } from "zod";

export const commentKindSchema = z.enum(["problem", "contest"]);

export type CommentTarget = { kind: z.infer<typeof commentKindSchema>; id: number };

export const addCommentSchema = z.object({
  kind: commentKindSchema,
  targetId: z.coerce.number().int().positive(),
  parentId: z.coerce.number().int().positive().optional(),
  content: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập nội dung bình luận")
    .max(2000, "Bình luận tối đa 2000 ký tự"),
});
