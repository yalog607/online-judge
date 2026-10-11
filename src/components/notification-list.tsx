import { requireUser } from "@/lib/dal";
import { listForUser } from "@/modules/notification/service";
import { MarkAllReadButton } from "@/components/notification-read-buttons";
import { NotificationRow } from "@/components/notification-row";
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
    <div className="flex flex-col gap-5 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[28px] font-bold tracking-[-0.03em]">Thông báo</h1>
        <MarkAllReadButton />
      </div>

      {items.length === 0 ? (
        <div className="card p-8 text-center text-fg-muted">Không có thông báo nào.</div>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {items.map((item) => (
            <li key={item.id}>
              <NotificationRow item={item} />
            </li>
          ))}
        </ul>
      )}

      <Pager page={page} pageSize={PAGE_SIZE} total={total} buildHref={buildHref} />
    </div>
  );
}
