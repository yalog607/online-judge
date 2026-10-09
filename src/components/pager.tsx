import Link from "next/link";

export function Pager({
  page,
  pageSize,
  total,
  buildHref,
}: {
  page: number;
  pageSize: number;
  total: number;
  buildHref: (page: number) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-1 py-3 text-sm text-fg-muted">
      <span>
        Hiển thị {from}-{to} trong tổng số {total}
      </span>
      <div className="flex gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <Link
            key={p}
            href={buildHref(p)}
            className={`grid h-8 w-8 place-items-center rounded-lg ${p === page ? "bg-primary text-primary-fg" : "hover:bg-muted"}`}
          >
            {p}
          </Link>
        ))}
      </div>
    </div>
  );
}
