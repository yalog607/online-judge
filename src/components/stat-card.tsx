import { Icon, type IconName } from "@/components/icon";

const TONE: Record<string, string> = {
  up: "text-ok",
  down: "text-bad",
  neutral: "text-fg-muted",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "up" | "down" | "neutral";
  icon: IconName;
}) {
  return (
    <div className="card flex items-start justify-between gap-3 px-5 py-[18px]">
      <div className="min-w-0">
        <div className="text-[13px] text-fg-muted">{label}</div>
        <div className="mt-1 mb-0.5 text-[28px] leading-tight font-bold tracking-tight tabular-nums">
          {value}
        </div>
        {hint ? (
          <div className={`text-xs ${TONE[tone]}`}>
            {tone === "up" ? "▲ " : tone === "down" ? "▼ " : ""}
            {hint}
          </div>
        ) : null}
      </div>
      <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[10px] bg-primary-soft text-primary">
        <Icon name={icon} size={18} />
      </span>
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-fg-muted">{children}</p>;
}
