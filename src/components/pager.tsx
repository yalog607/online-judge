import Link from "next/link";

function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

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
  const cell = "grid h-8 min-w-8 place-items-center rounded-lg px-2";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-3 text-sm text-fg-muted">
      <span>
        Hiển thị {from}-{to} trong tổng số {total}
      </span>
      <nav className="flex items-center gap-1" aria-label="Phân trang">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} className={`${cell} hover:bg-muted`} aria-label="Trang trước">
            ‹
          </Link>
        ) : (
          <span className={`${cell} opacity-40`}>‹</span>
        )}
        {pageWindow(page, totalPages).map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${i}`} className={cell}>
              …
            </span>
          ) : (
            <Link
              key={p}
              href={buildHref(p)}
              aria-current={p === page ? "page" : undefined}
              className={`${cell} ${p === page ? "bg-primary text-primary-fg" : "hover:bg-muted"}`}
            >
              {p}
            </Link>
          ),
        )}
        {page < totalPages ? (
          <Link href={buildHref(page + 1)} className={`${cell} hover:bg-muted`} aria-label="Trang sau">
            ›
          </Link>
        ) : (
          <span className={`${cell} opacity-40`}>›</span>
        )}
      </nav>
    </div>
  );
}
