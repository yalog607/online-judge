"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import type { FormState } from "@/modules/auth/actions";
import * as repo from "./repo";
import { notifyCommentLike, notifyCommentReply } from "@/modules/notification/events";
import { addCommentSchema, type CommentTarget } from "./schema";
import { firstIssue } from "@/lib/form-errors";

function revalidateTarget(target: CommentTarget) {
  if (target.kind === "problem") {
    revalidatePath(`/user/problems/${target.id}`);
  } else {
    revalidatePath(`/user/contests/${target.id}`);
    revalidatePath(`/teacher/contests/${target.id}`);
  }
}

export async function addCommentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = addCommentSchema.safeParse({
    kind: formData.get("kind"),
    targetId: formData.get("targetId"),
    parentId: formData.get("parentId") || undefined,
    content: formData.get("content"),
  });
  if (!parsed.success) return firstIssue(parsed.error);

  const { kind, targetId, ...rest } = parsed.data;
  const target: CommentTarget = { kind, id: targetId };
  try {
    await repo.addComment({ userId: user.userId, target, ...rest });
    if (rest.parentId) {
      await notifyCommentReply(rest.parentId, user.userId, user.fullName);
    }
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : "Không đăng được bình luận." };
  }
  revalidateTarget(target);
  return { ok: true };
}

export async function toggleLikeAction(target: CommentTarget, commentId: number) {
  const user = await requireUser();
  await repo.toggleLike(commentId, user.userId);
  await notifyCommentLike(commentId, user.userId, user.fullName);
  revalidateTarget(target);
}

export async function deleteCommentAction(target: CommentTarget, commentId: number) {
  const user = await requireUser();
  await repo.deleteComment(commentId, user.userId);
  revalidateTarget(target);
}
