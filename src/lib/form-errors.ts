import type { ZodError } from "zod";

/** Lỗi Zod đầu tiên kèm tên ô nhập (`field`) để giao diện đưa focus về đúng chỗ. */
export function firstIssue(error: ZodError): { error: string; field?: string } {
  const issue = error.issues[0];
  const head = issue.path[0];
  return { error: issue.message, field: typeof head === "string" ? head : undefined };
}
