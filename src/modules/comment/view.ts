import type { CommentRow } from "./repo";

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

function timeAgo(date: Date) {
  const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 60) return "vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} giờ trước`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

export function mapToCommentView(row: CommentRow): CommentView {
  return {
    id: row.CommentID,
    parentId: row.ParentID,
    userId: row.UserID,
    fullName: row.FullName,
    content: row.Content,
    timeAgo: timeAgo(new Date(row.CreatedAt)),
    likes: row.LikeCount,
    liked: row.LikedByMe,
    authorRole: row.AuthorRole,
  };
}
