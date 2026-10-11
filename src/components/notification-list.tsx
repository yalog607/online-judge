import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { listForUser } from "@/modules/notification/service";
import { MarkAllReadButton, MarkReadButton } from "@/components/notification-read-buttons";
import { Pager } from "@/components/pager";

const PAGE_SIZE = 20;

export async function NotificationList({
  basePath,
  searchParams,
}: {
  basePath: string;
  searchParams: { page?: string; unread?: string };
}) {
  const user = await requireUser();
  const onlyUnread = searchParams.unread === "1";
  const requested = Number.parseInt(searchParams.page ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const { items, total } = await listForUser(user.userId, {
    onlyUnread,
    offset: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
  });

  const buildHref = (p: number) => `${basePath}?${onlyUnread ? "unread=1&" : ""}page=${p}`;

  return (
    <div className="flex flex-col gap-4 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Thông báo</h1>
        <div className="flex items-center gap-3">
          <Link
            href={onlyUnread ? basePath : `${basePath}?unread=1`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {onlyUnread ? "Hiện tất cả" : "Chỉ chưa đọc"}
          </Link>
          <MarkAllReadButton />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card p-8 text-center text-fg-muted">Không có thông báo nào.</div>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex items-start gap-3 px-4 py-3 ${item.isRead ? "" : "bg-primary-soft/40"}`}
            >
              <div className="min-w-0 flex-1">
                {item.link ? (
                  <Link href={item.link} className={`hover:underline ${item.isRead ? "" : "font-semibold"}`}>
                    {item.title}
                  </Link>
                ) : (
                  <span className={item.isRead ? "" : "font-semibold"}>{item.title}</span>
                )}
                {item.body && <p className="text-sm text-fg-muted">{item.body}</p>}
                <time className="text-xs text-fg-muted" dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleString("vi-VN")}
                </time>
              </div>
              {!item.isRead && <MarkReadButton id={item.id} />}
            </li>
          ))}
        </ul>
      )}

      <Pager page={page} pageSize={PAGE_SIZE} total={total} buildHref={buildHref} />
    </div>
  );
}
