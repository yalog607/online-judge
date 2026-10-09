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
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${KIND_CLASS[kind]}`}
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
