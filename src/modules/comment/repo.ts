import "server-only";
import { execProc } from "@/db/exec";

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

export async function listComments(problemId: number, userId: number) {
  const { rows } = await execProc<CommentRow>("usp_Comment_List", {
    ProblemID: problemId,
    UserID: userId,
  });
  return rows;
}

export async function addComment(input: {
  problemId: number;
  userId: number;
  parentId?: number;
  content: string;
}) {
  await execProc("usp_Comment_Add", {
    ProblemID: input.problemId,
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
