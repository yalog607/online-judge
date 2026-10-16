import Link from "next/link";

export const searchInputClass =
  "min-w-[140px] flex-1 rounded-lg border border-line bg-muted px-3 py-2 text-sm";
export const tagInputClass =
  "min-w-[110px] w-[110px] rounded-lg border border-line bg-muted px-3 py-2 text-sm";
export const filterControlClass = "rounded-lg border border-line bg-muted px-3 py-2 text-sm";

/** Form lọc GET dùng chung cho mọi role. `children` là các ô nhập/chọn; nút Tìm kiếm và Xóa lọc có sẵn. */
export function SearchForm({
  sp,
  hidden,
  resetHref,
  children,
}: {
  sp: Record<string, string | undefined>;
  hidden?: Record<string, string | false | undefined>;
  resetHref?: string;
  children: React.ReactNode;
}) {
  // key đổi theo query để ô nhập được đặt lại khi bấm "Xóa lọc".
  const key = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][],
  ).toString();
  return (
    <form
      key={key}
      method="get"
      className="card scrollbar-hide flex items-center gap-2.5 overflow-x-auto p-2.5"
    >
      {Object.entries(hidden ?? {}).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      {children}
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition-opacity hover:opacity-90"
      >
        Tìm kiếm
      </button>
      {resetHref ? (
        <Link
          href={resetHref}
          className="shrink-0 rounded-lg border border-line bg-muted px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-muted/80"
        >
          Xóa lọc
        </Link>
      ) : null}
    </form>
  );
}

/** Chip "Đang lọc theo chủ đề" kèm nút bỏ lọc. */
export function TagFilterChip({
  tag,
  sp,
  basePath,
}: {
  tag?: string;
  sp: Record<string, string | undefined>;
  basePath: string;
}) {
  if (!tag) return null;
  const params = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][],
  );
  params.delete("tag");
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-fg-muted">Đang lọc theo chủ đề:</span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
        #{tag}
        <Link href={`${basePath}?${params.toString()}`} className="ml-1 font-bold hover:opacity-75">
          ✕
        </Link>
      </span>
    </div>
  );
}
