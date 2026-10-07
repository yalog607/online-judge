"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import type { FormState } from "@/modules/auth/actions";
import * as repo from "./repo";
import { addCommentSchema } from "./schema";

export async function addCommentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = addCommentSchema.safeParse({
    problemId: formData.get("problemId"),
    parentId: formData.get("parentId") || undefined,
    content: formData.get("content"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await repo.addComment({ userId: user.userId, ...parsed.data });
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : "Không đăng được bình luận." };
  }
  revalidatePath(`/user/problems/${parsed.data.problemId}`);
  return { ok: true };
}

export async function toggleLikeAction(problemId: number, commentId: number) {
  const user = await requireUser();
  await repo.toggleLike(commentId, user.userId);
  revalidatePath(`/user/problems/${problemId}`);
}

export async function deleteCommentAction(problemId: number, commentId: number) {
  const user = await requireUser();
  await repo.deleteComment(commentId, user.userId);
  revalidatePath(`/user/problems/${problemId}`);
}
