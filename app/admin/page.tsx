import { getAdminDashboard } from "@/modules/dashboard/service";
import { requireRole } from "@/lib/dal";
import { StatCard, Panel, EmptyNote } from "@/components/stat-card";
import { LineChart, DonutChart } from "@/components/dashboard-charts";

export const metadata = { title: "Tổng quan hệ thống - ITOJ Admin" };

const VN_TZ = "Asia/Ho_Chi_Minh";
const nf = new Intl.NumberFormat("vi-VN");

const LANGUAGE_LABELS: Record<string, string> = {
  cpp: "C++",
  c: "C",
  java: "Java",
  python: "Python",
  javascript: "JavaScript",
  go: "Go",
  csharp: "C#",
};
const SLICE_COLORS = [
  "var(--primary)",
  "var(--indigo)",
  "var(--ok)",
  "var(--warn)",
  "var(--bad)",
  "var(--fg-muted)",
  "var(--neutral-soft)",
];

const ACTIONS: Record<string, string> = {
  SetUserRole: "Đổi vai trò người dùng",
  SetUserStatus: "Đổi trạng thái tài khoản",
  ImpersonateStart: "Đăng nhập thay người dùng",
  IMPERSONATE_SESSION_START: "Đăng nhập thay người dùng",
  CONTEST_CREATE: "Tạo kỳ thi",
  CONTEST_UPDATE: "Cập nhật kỳ thi",
  CONTEST_DELETE: "Xóa kỳ thi",
  DOCUMENT_UPLOAD: "Tải lên tài liệu",
  DOCUMENT_DELETE: "Xóa tài liệu",
  "CREATE:Problem": "Tạo bài tập",
  "UPDATE:Problem": "Cập nhật bài tập",
  "UPDATE:User": "Cập nhật tài khoản",
};

function relativeTime(d: Date) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return new Date(d).toLocaleDateString("vi-VN", { timeZone: VN_TZ });
}

export default async function AdminDashboard() {
  await requireRole("Admin");
  const { summary: s, hours, languages, audit } = await getAdminDashboard();

  const change =
    s.SubmissionsPrev24h > 0
      ? Math.round(((s.Submissions24h - s.SubmissionsPrev24h) / s.SubmissionsPrev24h) * 100)
      : null;

  const slices = languages.map((l, i) => ({
    label: LANGUAGE_LABELS[l.Language] ?? l.Language,
    value: l.Cnt,
    color: SLICE_COLORS[i % SLICE_COLORS.length],
  }));

  return (
    <div className="flex flex-col gap-5 pt-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tổng quan hệ thống</h1>
        <p className="mt-1 text-fg-muted">Số liệu vận hành 24 giờ gần nhất.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="users"
          label="Người dùng"
          value={nf.format(s.TotalUsers)}
          hint={`+${s.NewUsersToday} hôm nay`}
          tone={s.NewUsersToday > 0 ? "up" : "neutral"}
        />
        <StatCard
          icon="send"
          label="Bài nộp / 24 giờ"
          value={nf.format(s.Submissions24h)}
          hint={change === null ? "Chưa có dữ liệu kỳ trước" : `${change >= 0 ? "+" : ""}${change}%`}
          tone={change === null || change === 0 ? "neutral" : change > 0 ? "up" : "down"}
        />
        <StatCard
          icon="server"
          label="Hàng đợi chấm"
          value={s.QueueCount}
          hint={`Worker ${s.WorkersActive}/${s.WorkersTotal} hoạt động`}
          tone={s.WorkersTotal > 0 && s.WorkersActive === 0 ? "down" : "neutral"}
        />
        <StatCard
          icon="flag"
          label="Lỗi hệ thống"
          value={s.Errors24h}
          hint={s.Errors24h > 0 ? "Cần kiểm tra" : "Không có lỗi"}
          tone={s.Errors24h > 0 ? "down" : "neutral"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Lượt nộp theo giờ">
          <div className="p-5">
            <LineChart
              values={hours.map((h) => h.Cnt)}
              labels={hours.map((h) => `${h.StartHour}h`)}
            />
          </div>
        </Panel>
        <Panel title="Ngôn ngữ sử dụng (30 ngày)">
          {slices.length === 0 ? (
            <EmptyNote>Chưa có bài nộp nào.</EmptyNote>
          ) : (
            <div className="p-5">
              <DonutChart slices={slices} />
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Hoạt động gần đây">
        {audit.length === 0 ? (
          <EmptyNote>Chưa có hoạt động quản trị nào.</EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="text-left text-xs font-semibold tracking-wide text-fg-muted uppercase">
                  <th className="border-b border-line px-5 py-3">Sự kiện</th>
                  <th className="border-b border-line px-5 py-3">Người thực hiện</th>
                  <th className="border-b border-line px-5 py-3">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => {
                  const target = a.TargetName ?? (a.TargetID ? `#${a.TargetID}` : "");
                  return (
                    <tr key={a.AuditID} className="border-b border-line last:border-0">
                      <td className="px-5 py-3.5">
                        {ACTIONS[`${a.Action}:${a.TargetType}`] ?? ACTIONS[a.Action] ?? a.Action}
                        {target ? <span className="text-fg-muted"> · {target}</span> : null}
                      </td>
                      <td className="px-5 py-3.5">{a.ActorName}</td>
                      <td className="px-5 py-3.5 text-fg-muted">{relativeTime(a.CreatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
