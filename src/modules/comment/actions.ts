"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import type { FormState } from "@/modules/auth/actions";
import * as repo from "./repo";
import { notifyCommentLike, notifyCommentReply } from "@/modules/notification/events";
import { addCommentSchema } from "./schema";
import { firstIssue } from "@/lib/form-errors";

export async function addCommentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = addCommentSchema.safeParse({
    problemId: formData.get("problemId"),
    parentId: formData.get("parentId") || undefined,
    content: formData.get("content"),
  });
  if (!parsed.success) return firstIssue(parsed.error);

  try {
    await repo.addComment({ userId: user.userId, ...parsed.data });
    if (parsed.data.parentId) {
      await notifyCommentReply(parsed.data.parentId, user.userId, user.fullName);
    }
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : "Không đăng được bình luận." };
  }
  revalidatePath(`/user/problems/${parsed.data.problemId}`);
  return { ok: true };
}

export async function toggleLikeAction(problemId: number, commentId: number) {
  const user = await requireUser();
  await repo.toggleLike(commentId, user.userId);
  await notifyCommentLike(commentId, user.userId, user.fullName);
  revalidatePath(`/user/problems/${problemId}`);
}

export async function deleteCommentAction(problemId: number, commentId: number) {
  const user = await requireUser();
  await repo.deleteComment(commentId, user.userId);
  revalidatePath(`/user/problems/${problemId}`);
}
