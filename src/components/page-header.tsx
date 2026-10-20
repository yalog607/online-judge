import Link from "next/link";

export function PageHeader({
  title,
  description,
  badge,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  action?: { href: string; label: string } | React.ReactNode;
}) {
  const isLink = action && typeof action === "object" && "href" in (action as object);
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
          {badge}
        </div>
        {description ? <p className="mt-1 text-fg-muted">{description}</p> : null}
      </div>
      {isLink ? (
        <Link
          href={(action as { href: string }).href}
          className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg hover:opacity-90"
        >
          {(action as { label: string }).label}
        </Link>
      ) : (
        (action as React.ReactNode)
      )}
    </div>
  );
}
