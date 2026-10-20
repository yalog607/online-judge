import Link from "next/link";
import { Pager } from "@/components/pager";
import { EmptyState } from "@/components/empty-state";

export function ClassCard({
  href,
  name,
  description,
  teacherName,
  studentCount,
  kicker,
  kickerTone = "primary",
  badges,
  ctaLabel,
  variant = "default",
}: {
  href: string;
  name: string;
  description?: string | null;
  teacherName: string;
  studentCount?: number;
  kicker: string;
  kickerTone?: "primary" | "bad" | "muted" | "ok" | "warn";
  badges?: React.ReactNode;
  ctaLabel: string;
  variant?: "default" | "ta";
}) {
  const tone = {
    primary: "text-primary",
    bad: "text-bad",
    muted: "text-fg-muted",
    ok: "text-ok",
    warn: "text-warn",
  }[kickerTone];
  return (
    <article
      className={`card card-hover relative flex flex-col justify-between p-5 ${
        variant === "ta" ? "border-primary/30 bg-primary/5" : ""
      }`}
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-medium ${tone}`}>{kicker}</span>
          {badges}
        </div>
        <h3 className="mt-1 text-lg font-semibold text-fg">
          <Link href={href} className="hover:underline after:absolute after:inset-0">
            {name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-fg-muted">
          {description || "Không có mô tả."}
        </p>
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-line pt-3 text-xs text-fg-muted">
        <span>
          GV: {teacherName}
          {studentCount !== undefined ? ` · ${studentCount} học viên` : ""}
        </span>
        <Link href={href} className="font-medium text-fg hover:underline">
          {ctaLabel} →
        </Link>
      </div>
    </article>
  );
}

export function ClassSection({
  title,
  empty,
  children,
  isEmpty,
  pager,
}: {
  title: string;
  empty: string;
  isEmpty: boolean;
  children: React.ReactNode;
  pager?: { page: number; pageSize: number; total: number; buildHref: (p: number) => string };
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {isEmpty ? (
        <EmptyState>{empty}</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      )}
      {pager ? <Pager {...pager} /> : null}
    </section>
  );
}
