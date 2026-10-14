import { NotificationList } from "@/components/notification-list";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; unread?: string }>;
}) {
  return <NotificationList basePath="/admin/notifications" searchParams={await searchParams} />;
}
