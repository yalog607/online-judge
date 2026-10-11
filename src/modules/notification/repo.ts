import { execProc } from "@/db/exec";
import type { NotificationItem } from "./types";

type CreatedRow = { NotificationID: number | string; UserID: number; CreatedAt: Date | string };
type ListRow = {
  NotificationID: number | string;
  Type: string;
  Title: string;
  Body: string | null;
  Link: string | null;
  IsRead: boolean;
  CreatedAt: Date | string;
  Total: number;
};

const iso = (v: Date | string) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

export async function createNotifications(input: {
  userIds: number[];
  type: string;
  title: string;
  body?: string;
  link?: string;
}): Promise<{ id: number; userId: number; createdAt: string }[]> {
  const { rows } = await execProc<CreatedRow>("usp_Notification_Create", {
    UserIDs: input.userIds.join(","),
    Type: input.type,
    Title: input.title,
    Body: input.body ?? null,
    Link: input.link ?? null,
  });
  return rows.map((r) => ({ id: Number(r.NotificationID), userId: r.UserID, createdAt: iso(r.CreatedAt) }));
}

export async function aggregateNotification(input: {
  userId: number;
  type: string;
  titleTemplate: string;
  body?: string;
  link: string;
}): Promise<{ id: number; userId: number; createdAt: string; title: string; updated: boolean } | null> {
  const { rows } = await execProc<{
    NotificationID: number | string;
    UserID: number;
    CreatedAt: Date | string;
    Title: string;
    Updated: boolean;
  }>("usp_Notification_Aggregate", {
    UserID: input.userId,
    Type: input.type,
    TitleTemplate: input.titleTemplate,
    Body: input.body ?? null,
    Link: input.link,
  });
  const r = rows[0];
  if (!r) return null;
  return {
    id: Number(r.NotificationID),
    userId: r.UserID,
    createdAt: iso(r.CreatedAt),
    title: r.Title,
    updated: Boolean(r.Updated),
  };
}

export async function listNotifications(
  userId: number,
  opts: { onlyUnread?: boolean; offset?: number; limit?: number } = {},
): Promise<{ items: NotificationItem[]; total: number }> {
  const { rows } = await execProc<ListRow>("usp_Notification_List", {
    UserID: userId,
    OnlyUnread: opts.onlyUnread ?? false,
    Offset: opts.offset ?? 0,
    Limit: opts.limit ?? 20,
  });
  const items = rows.map((r) => ({
    id: Number(r.NotificationID),
    type: r.Type,
    title: r.Title,
    body: r.Body,
    link: r.Link,
    createdAt: iso(r.CreatedAt),
    isRead: Boolean(r.IsRead),
  }));
  return { items, total: Number(rows[0]?.Total ?? 0) };
}

export async function unreadCount(userId: number): Promise<number> {
  const { rows } = await execProc<{ Unread: number }>("usp_Notification_UnreadCount", { UserID: userId });
  return Number(rows[0]?.Unread ?? 0);
}

export async function markRead(userId: number, notificationId: number) {
  await execProc("usp_Notification_MarkRead", { UserID: userId, NotificationID: notificationId });
}

export async function markAllRead(userId: number) {
  await execProc("usp_Notification_MarkAllRead", { UserID: userId });
}

// --- recipient lookups (used by events.ts) ---

export async function submissionInfo(submissionId: number) {
  const { rows } = await execProc<{ UserID: number; ProblemID: number; ProblemTitle: string }>(
    "usp_Notification_SubmissionInfo",
    { SubmissionID: submissionId },
  );
  return rows[0] ?? null;
}

export async function problemInfo(problemId: number) {
  const { rows } = await execProc<{ CreatorID: number; Title: string; RejectionReason: string | null }>(
    "usp_Notification_ProblemInfo",
    { ProblemID: problemId },
  );
  return rows[0] ?? null;
}

export async function commentInfo(commentId: number, userId: number) {
  const { rows } = await execProc<{
    AuthorID: number;
    ProblemID: number;
    ParentID: number | null;
    LikedByUser: boolean;
  }>("usp_Notification_CommentInfo", { CommentID: commentId, UserID: userId });
  return rows[0] ?? null;
}

export async function classInfo(classId: number) {
  const { rows } = await execProc<{ ClassName: string }>("usp_Notification_ClassInfo", { ClassID: classId });
  return rows[0] ?? null;
}

export async function classStudentIds(classId: number): Promise<number[]> {
  const { rows } = await execProc<{ UserID: number }>("usp_Notification_ClassStudents", { ClassID: classId });
  return rows.map((r) => r.UserID);
}

export async function contestInfo(contestId: number) {
  const { rows } = await execProc<{ CreatorID: number; ContestName: string }>(
    "usp_Notification_ContestInfo",
    { ContestID: contestId },
  );
  return rows[0] ?? null;
}

export async function contestParticipantIds(contestId: number): Promise<number[]> {
  const { rows } = await execProc<{ UserID: number }>("usp_Notification_ContestParticipants", {
    ContestID: contestId,
  });
  return rows.map((r) => r.UserID);
}
