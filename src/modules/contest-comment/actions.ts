"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import type { FormState } from "@/modules/auth/actions";
import * as repo from "./repo";
import { addContestCommentSchema } from "./schema";

export async function addContestCommentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = addContestCommentSchema.safeParse({
    contestId: formData.get("contestId"),
    parentId: formData.get("parentId") || undefined,
    content: formData.get("content"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await repo.addComment({ userId: user.userId, ...parsed.data });
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : "Không đăng được bình luận." };
  }
  revalidatePath(`/user/contests/${parsed.data.contestId}`);
  revalidatePath(`/teacher/contests/${parsed.data.contestId}`);
  return { ok: true };
}

export async function toggleLikeContestCommentAction(contestId: number, commentId: number) {
  const user = await requireUser();
  await repo.toggleLike(commentId, user.userId);
  revalidatePath(`/user/contests/${contestId}`);
  revalidatePath(`/teacher/contests/${contestId}`);
}

export async function deleteContestCommentAction(contestId: number, commentId: number) {
  const user = await requireUser();
  await repo.deleteComment(commentId, user.userId);
  revalidatePath(`/user/contests/${contestId}`);
  revalidatePath(`/teacher/contests/${contestId}`);
}
