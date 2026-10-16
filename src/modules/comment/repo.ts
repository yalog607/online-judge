import "server-only";
import { execProc } from "@/db/exec";
import type { CommentTarget } from "./schema";

export type CommentRow = {
  CommentID: number;
  ParentID: number | null;
  UserID: number;
  FullName: string;
  Avatar: string | null;
  Content: string;
  CreatedAt: string;
  LikeCount: number;
  LikedByMe: boolean;
  AuthorRole: string;
};

function targetParams(target: CommentTarget) {
  return target.kind === "problem" ? { ProblemID: target.id } : { ContestID: target.id };
}

export async function listComments(target: CommentTarget, userId: number) {
  const { rows } = await execProc<CommentRow>("usp_Comment_List", {
    ...targetParams(target),
    UserID: userId,
  });
  return rows;
}

export async function addComment(input: {
  target: CommentTarget;
  userId: number;
  parentId?: number;
  content: string;
}) {
  await execProc("usp_Comment_Add", {
    ...targetParams(input.target),
    UserID: input.userId,
    ParentID: input.parentId,
    Content: input.content,
  });
}

export async function toggleLike(commentId: number, userId: number) {
  await execProc("usp_Comment_ToggleLike", { CommentID: commentId, UserID: userId });
}

export async function deleteComment(commentId: number, userId: number) {
  await execProc("usp_Comment_Delete", { CommentID: commentId, UserID: userId });
}
