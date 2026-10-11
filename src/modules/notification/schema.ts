import { z } from "zod";

export const NOTIFICATION_TYPES = [
  "judge_result",
  "problem_approved",
  "problem_rejected",
  "class_student_added",
  "class_student_removed",
  "class_document_added",
  "comment_reply",
  "comment_like",
  "contest_joined",
  "contest_started",
] as const;

// Internal paths only: must start with a single "/" and carry no scheme, backslash or markup.
export function isSafeLink(link: string): boolean {
  return link.startsWith("/") && !link.startsWith("//") && !/[\\<>"]|:\/\//.test(link);
}

export const notifyInputSchema = z.object({
  userIds: z
    .array(z.number().int().positive())
    .min(1)
    .max(500)
    .transform((ids) => [...new Set(ids)]),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(500).optional(),
  link: z.string().max(300).refine(isSafeLink, "Đường dẫn không hợp lệ").optional(),
});

export type NotifyInput = z.input<typeof notifyInputSchema>;
export type NotifyParsed = z.output<typeof notifyInputSchema>;
