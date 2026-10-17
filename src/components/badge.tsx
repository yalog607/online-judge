const KIND_CLASS: Record<string, string> = {
  ok: "bg-ok-soft text-ok",
  bad: "bg-bad-soft text-bad",
  warn: "bg-warn-soft text-warn",
  info: "bg-primary-soft text-primary",
  neutral: "bg-neutral-soft text-fg-muted",
};

export function Badge({
  children,
  kind = "neutral",
}: {
  children: React.ReactNode;
  kind?: keyof typeof KIND_CLASS;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${KIND_CLASS[kind]}`}
    >
      {children}
    </span>
  );
}

const DIFFICULTY_KIND: Record<string, keyof typeof KIND_CLASS> = {
  Easy: "ok",
  Medium: "warn",
  Hard: "bad",
};
const DIFFICULTY_LABEL: Record<string, string> = { Easy: "Dễ", Medium: "Trung bình", Hard: "Khó" };

export function DifficultyBadge({ value, difficulty }: { value?: string; difficulty?: string }) {
  const v = value ?? difficulty ?? "";
  return <Badge kind={DIFFICULTY_KIND[v] ?? "neutral"}>{DIFFICULTY_LABEL[v] ?? v}</Badge>;
}

const STATUS_LABEL: Record<string, string> = {
  Public: "Công khai",
  Private: "Riêng tư",
  Hidden: "Đã khóa",
  Pending: "Chờ duyệt",
  Rejected: "Bị từ chối",
};
const STATUS_KIND: Record<string, keyof typeof KIND_CLASS> = {
  Public: "ok",
  Private: "warn",
  Hidden: "bad",
  Pending: "info",
  Rejected: "bad",
};

export function ProblemStatusBadge({ value, status }: { value?: string; status?: string }) {
  const v = value ?? status ?? "";
  return <Badge kind={STATUS_KIND[v] ?? "neutral"}>{STATUS_LABEL[v] ?? v}</Badge>;
}

const USER_STATUS_LABEL: Record<string, string> = {
  done: "Đã giải",
  tried: "Đã thử",
  todo: "Chưa làm",
};
const USER_STATUS_KIND: Record<string, keyof typeof KIND_CLASS> = {
  done: "ok",
  tried: "warn",
  todo: "neutral",
};

export function UserStatusBadge({ value }: { value: string }) {
  return (
    <Badge kind={USER_STATUS_KIND[value] ?? "neutral"}>{USER_STATUS_LABEL[value] ?? value}</Badge>
  );
}

const VERDICT_LABEL: Record<string, string> = {
  AC: "Accepted",
  WA: "Wrong Answer",
  TLE: "Time Limit",
  MLE: "Memory Limit",
  RE: "Runtime Error",
  CE: "Compile Error",
  IE: "Lỗi hệ thống",
  Pending: "Đang chờ…",
  Judging: "Đang chấm…",
};
const VERDICT_KIND: Record<string, keyof typeof KIND_CLASS> = {
  AC: "ok",
  WA: "bad",
  TLE: "warn",
  MLE: "warn",
  RE: "bad",
  CE: "warn",
  IE: "bad",
  Pending: "info",
  Judging: "info",
};

export function VerdictBadge({ value }: { value: string }) {
  return <Badge kind={VERDICT_KIND[value] ?? "neutral"}>{VERDICT_LABEL[value] ?? value}</Badge>;
}

export function ContestStatusBadge({
  status,
  className,
}: {
  status: "Upcoming" | "Ongoing" | "Ended";
  className?: string;
}) {
  if (status === "Ongoing") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20 whitespace-nowrap shrink-0 ${className ?? ""}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        Đang diễn ra
      </span>
    );
  }
  if (status === "Upcoming") {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20 whitespace-nowrap shrink-0 ${className ?? ""}`}
      >
        Sắp diễn ra
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-400 border border-slate-500/20 whitespace-nowrap shrink-0 ${className ?? ""}`}
    >
      Đã kết thúc
    </span>
  );
}

const APPROVAL_KIND: Record<string, keyof typeof KIND_CLASS> = {
  Approved: "ok",
  Rejected: "bad",
  Pending: "warn",
};
const APPROVAL_LABEL: Record<string, string> = {
  Approved: "Đã duyệt",
  Rejected: "Bị từ chối",
  Pending: "Chờ duyệt",
};

export function ClassApprovalBadge({ status }: { status: string }) {
  return (
    <Badge kind={APPROVAL_KIND[status] ?? "warn"}>{APPROVAL_LABEL[status] ?? "Chờ duyệt"}</Badge>
  );
}

export function ClassActiveBadge({ cancelled }: { cancelled: boolean }) {
  return cancelled ? <Badge>Đã hủy</Badge> : <Badge kind="ok">Đang hoạt động</Badge>;
}
