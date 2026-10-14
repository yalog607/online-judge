import "server-only";
import { execProc } from "@/db/exec";

export type ContestCommentRow = {
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

export async function listComments(contestId: number, userId: number) {
  const { rows } = await execProc<ContestCommentRow>("usp_ContestComment_List", {
    ContestID: contestId,
    UserID: userId,
  });
  return rows;
}

export async function addComment(input: {
  contestId: number;
  userId: number;
  parentId?: number;
  content: string;
}) {
  await execProc("usp_ContestComment_Add", {
    ContestID: input.contestId,
    UserID: input.userId,
    ParentID: input.parentId,
    Content: input.content,
  });
}

export async function toggleLike(commentId: number, userId: number) {
  await execProc("usp_ContestComment_ToggleLike", { CommentID: commentId, UserID: userId });
}

export async function deleteComment(commentId: number, userId: number) {
  await execProc("usp_ContestComment_Delete", { CommentID: commentId, UserID: userId });
}
