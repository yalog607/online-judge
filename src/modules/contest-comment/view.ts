import type { ContestCommentRow } from "./repo";

export type CommentView = {
  id: number;
  parentId: number | null;
  userId: number;
  fullName: string;
  content: string;
  timeAgo: string;
  likes: number;
  liked: boolean;
  authorRole: string;
};

export function mapToCommentView(row: ContestCommentRow): CommentView {
  return {
    id: row.CommentID,
    parentId: row.ParentID,
    userId: row.UserID,
    fullName: row.FullName,
    content: row.Content,
    timeAgo: new Date(row.CreatedAt).toLocaleString("vi-VN"),
    likes: row.LikeCount,
    liked: row.LikedByMe,
    authorRole: row.AuthorRole,
  };
}
