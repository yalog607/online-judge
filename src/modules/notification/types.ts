export type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: string;
  isRead: boolean;
};

export type StreamMessage =
  | { kind: "ready"; unread: number }
  // `updated`: an existing unread notification changed in place (aggregated), so it is not a new unread.
  | { kind: "notification"; item: NotificationItem; updated?: boolean };
