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
  | { kind: "notification"; item: NotificationItem };
