import Link from "next/link";
import { requireRole } from "@/lib/dal";
import {
  getClassReport,
  getContestReport,
  getReportOptions,
} from "@/modules/report/service";
import { PassFailDonutChart, ProblemPassRateBarChart } from "./charts";
import { Badge } from "@/components/badge";
import { Icon } from "@/components/icon";

export const metadata = { title: "Báo cáo thống kê - ITOJ Admin" };

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const admin = await requireRole("Admin");
  const sp = await searchParams;

  const type = sp.type === "contest" ? "contest" : "class";
  const { classes, contests } = await getReportOptions(admin.userId);

  // Selected ID fallback
  let selectedId = typeof sp.id === "string" ? parseInt(sp.id, 10) : undefined;
  if (!selectedId || isNaN(selectedId)) {
    if (type === "class" && classes.length > 0) {
      selectedId = classes[0].ClassID;
    } else if (type === "contest" && contests.length > 0) {
      selectedId = contests[0].ContestID;
    }
  }

  // Fetch report data
  let classReportData = null;
  let contestReportData = null;

  if (type === "class" && selectedId) {
    classReportData = await getClassReport(admin.userId, selectedId);
  } else if (type === "contest" && selectedId) {
    contestReportData = await getContestReport(admin.userId, selectedId);
  }

  const summary = type === "class" ? classReportData?.summary : contestReportData?.summary;
  const problems = (type === "class" ? classReportData?.problems : contestReportData?.problems) ?? [];
  const people = (type === "class" ? classReportData?.students : contestReportData?.participants) ?? [];

  const tab = sp.tab === "problems" ? "problems" : "people";

  return (
    <div className="flex flex-col gap-6 pt-8">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Báo cáo thống kê</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Biểu đồ tỉ lệ đạt/trượt chi tiết theo lớp học hoặc kỳ thi & xuất dữ liệu bảng tính.
          </p>
        </div>

        {selectedId && summary && (
          <a
            href={`/api/admin/reports/export?type=${type}&id=${selectedId}`}
            download
            className="inline-flex items-center gap-2 rounded-lg bg-ok px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:opacity-90 shrink-0"
          >
            <Icon name="upload" size={16} className="rotate-180" />
            <span>Xuất Excel (.xlsx)</span>
          </a>
        )}
      </div>

      {/* Mode & Target Selectors */}
      <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/reports?type=class${classes[0] ? `&id=${classes[0].ClassID}` : ""}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              type === "class"
                ? "bg-primary text-primary-fg shadow-xs"
                : "bg-muted text-fg-muted hover:text-fg hover:bg-line"
            }`}
          >
            Theo Lớp học
          </Link>
          <Link
            href={`/admin/reports?type=contest${contests[0] ? `&id=${contests[0].ContestID}` : ""}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              type === "contest"
                ? "bg-primary text-primary-fg shadow-xs"
                : "bg-muted text-fg-muted hover:text-fg hover:bg-line"
            }`}
          >
            Theo Kỳ thi
          </Link>
        </div>

        {/* Dropdown selector */}
        <form method="get" className="flex items-center gap-2">
          <input type="hidden" name="type" value={type} />
          <span className="text-xs text-fg-muted">Chọn {type === "class" ? "lớp" : "kỳ thi"}:</span>
          <select
            name="id"
            defaultValue={selectedId ?? ""}
            className="min-w-[220px] max-w-[340px] truncate rounded-lg border border-line bg-muted px-3 py-1.5 text-sm font-medium text-fg focus:border-primary focus:outline-none"
          >
            {type === "class" ? (
              classes.length > 0 ? (
                classes.map((c) => (
                  <option key={c.ClassID} value={c.ClassID}>
                    {c.ClassName} ({c.TeacherName})
                    {c.ApprovalStatus && c.ApprovalStatus !== "Approved" ? ` [${c.ApprovalStatus}]` : ""}
                  </option>
                ))
              ) : (
                <option value="">-- Không có lớp học nào --</option>
              )
            ) : contests.length > 0 ? (
              contests.map((ct) => (
                <option key={ct.ContestID} value={ct.ContestID}>
                  {ct.ContestName} [{ct.Status}]
                </option>
              ))
            ) : (
              <option value="">-- Không có kỳ thi nào --</option>
            )}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-muted border border-line px-3 py-1.5 text-xs font-medium text-fg hover:bg-line transition"
          >
            Xem
          </button>
        </form>
      </div>

      {!summary ? (
        <div className="card p-12 text-center text-fg-muted">
          <p className="text-base font-medium">Chưa có dữ liệu để thống kê.</p>
          <p className="text-xs mt-1">
            Vui lòng chọn một {type === "class" ? "lớp học" : "kỳ thi"} hợp lệ có thành viên và bài tập.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="card p-4">
              <span className="text-xs text-fg-muted font-medium">Tổng lượt nộp</span>
              <div className="mt-1 text-2xl font-bold text-fg">
                {summary.TotalSubmissions}
              </div>
              <span className="text-[11px] text-fg-muted">Toàn bộ bài làm</span>
            </div>

            <div className="card p-4 border-l-4 border-l-ok">
              <span className="text-xs text-ok font-medium">Lượt nộp Đạt (AC)</span>
              <div className="mt-1 text-2xl font-bold text-ok">
                {summary.TotalAC}
              </div>
              <span className="text-[11px] text-fg-muted font-mono font-medium">
                {summary.PassRatePercent.toFixed(1)}% tỉ lệ đạt
              </span>
            </div>

            <div className="card p-4 border-l-4 border-l-bad">
              <span className="text-xs text-bad font-medium">Lượt nộp Trượt</span>
              <div className="mt-1 text-2xl font-bold text-bad">
                {summary.TotalFailed}
              </div>
              <span className="text-[11px] text-fg-muted font-mono font-medium">
                {(100 - summary.PassRatePercent).toFixed(1)}% tỉ lệ trượt
              </span>
            </div>

            <div className="card p-4">
              <span className="text-xs text-fg-muted font-medium">
                {type === "class" ? "Số lượng học sinh" : "Số lượng thí sinh"}
              </span>
              <div className="mt-1 text-2xl font-bold text-fg">
                {"TotalStudents" in summary ? summary.TotalStudents : summary.TotalParticipants}
              </div>
              <span className="text-[11px] text-fg-muted">Thành viên tham gia</span>
            </div>

            <div className="card p-4">
              <span className="text-xs text-fg-muted font-medium">Số lượng bài tập</span>
              <div className="mt-1 text-2xl font-bold text-fg">
                {summary.TotalProblems}
              </div>
              <span className="text-[11px] text-fg-muted">Bài tập giao / thi</span>
            </div>
          </div>

          {/* Visual Charts: Donut + Bar Chart */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <PassFailDonutChart
                passCount={summary.TotalAC}
                failCount={summary.TotalFailed}
                waCount={summary.TotalWA}
                tleCount={summary.TotalTLE}
                reCount={summary.TotalRE}
                ceCount={summary.TotalCE}
              />
            </div>

            <div className="lg:col-span-3">
              <ProblemPassRateBarChart
                problems={problems.map((p) => ({
                  id: p.ProblemID,
                  title: p.Title,
                  totalSubmissions: p.TotalSubmissions,
                  totalAC: p.TotalAC,
                  totalFailed: p.TotalFailed,
                  passRatePercent: p.PassRatePercent,
                }))}
              />
            </div>
          </div>

          {/* Detailed Tables with Tabs */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4 border-b border-line pb-2">
              <Link
                href={`/admin/reports?type=${type}&id=${selectedId}&tab=people`}
                className={`font-medium pb-2 -mb-[9px] text-sm transition ${
                  tab === "people"
                    ? "border-b-2 border-primary text-primary font-semibold"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                {type === "class" ? "Chi tiết theo Học sinh" : "Chi tiết theo Thí sinh"} ({people.length})
              </Link>

              <Link
                href={`/admin/reports?type=${type}&id=${selectedId}&tab=problems`}
                className={`font-medium pb-2 -mb-[9px] text-sm transition ${
                  tab === "problems"
                    ? "border-b-2 border-primary text-primary font-semibold"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                Chi tiết theo Bài tập ({problems.length})
              </Link>
            </div>

            {/* TAB 1: Danh sách học sinh / thí sinh */}
            {tab === "people" && (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-line bg-muted/40 text-xs font-semibold text-fg-muted uppercase tracking-wider">
                        <th className="w-[24%] min-w-[180px] px-4 py-3.5 text-left">Học sinh / Thí sinh</th>
                        <th className="w-[14%] min-w-[110px] px-4 py-3.5 text-left">Tên đăng nhập</th>
                        <th className="w-[20%] min-w-[160px] px-4 py-3.5 text-left">Email</th>
                        <th className="w-[10%] min-w-[90px] px-3 py-3.5 text-center">
                          {type === "class" ? "Tiến độ" : "Điểm số"}
                        </th>
                        <th className="w-[10%] min-w-[90px] px-3 py-3.5 text-center">Bài đã giải</th>
                        <th className="w-[10%] min-w-[90px] px-3 py-3.5 text-center">Lượt nộp</th>
                        <th className="w-[12%] min-w-[100px] px-3 py-3.5 text-center">Tỉ lệ Đạt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {people.map((u) => {
                        const scoreOrProgress =
                          "ProgressPercent" in u ? `${u.ProgressPercent}%` : `${(u as any).TotalScore}đ`; /* eslint-disable-line @typescript-eslint/no-explicit-any */
                        const isPass = u.ProblemsSolved > 0;

                        return (
                          <tr key={u.UserID} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3.5 font-medium text-fg truncate">
                              {u.FullName}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-xs text-fg-muted truncate">
                              @{u.Username}
                            </td>
                            <td className="px-4 py-3.5 text-fg-muted truncate">{u.Email}</td>
                            <td className="px-3 py-3.5 text-center font-semibold text-fg text-xs">
                              {scoreOrProgress}
                            </td>
                            <td className="px-3 py-3.5 text-center font-mono font-medium text-fg text-xs">
                              {u.ProblemsSolved} bài
                            </td>
                            <td className="px-3 py-3.5 text-center text-xs text-fg-muted">
                              {u.TotalAC}/{u.TotalSubmissions} AC
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <Badge kind={isPass ? "ok" : "warn"}>
                                {u.PassRatePercent.toFixed(0)}%
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}

                      {people.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-5 py-12 text-center text-fg-muted">
                            Chưa có dữ liệu học sinh/thí sinh nộp bài.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: Danh sách bài tập */}
            {tab === "problems" && (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-line bg-muted/40 text-xs font-semibold text-fg-muted uppercase tracking-wider">
                        <th className="w-[10%] min-w-[70px] px-4 py-3.5 text-left">Mã bài</th>
                        <th className="w-[30%] min-w-[200px] px-4 py-3.5 text-left">Tên bài tập</th>
                        <th className="w-[12%] min-w-[90px] px-3 py-3.5 text-center">
                          {type === "class" ? "Độ khó" : "Điểm tối đa"}
                        </th>
                        <th className="w-[12%] min-w-[90px] px-3 py-3.5 text-center">Tổng lượt nộp</th>
                        <th className="w-[12%] min-w-[90px] px-3 py-3.5 text-center">Lượt Đạt (AC)</th>
                        <th className="w-[12%] min-w-[90px] px-3 py-3.5 text-center">Lượt Trượt</th>
                        <th className="w-[12%] min-w-[100px] px-3 py-3.5 text-center">Tỉ lệ Đạt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {problems.map((p) => {
                        const extraLabel = "Difficulty" in p ? p.Difficulty : `${(p as any).MaxScore}đ`; /* eslint-disable-line @typescript-eslint/no-explicit-any */
                        return (
                          <tr key={p.ProblemID} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3.5 font-mono text-xs text-fg-muted">
                              #{p.ProblemID}
                            </td>
                            <td className="px-4 py-3.5 font-medium text-fg truncate">
                              {p.Title}
                            </td>
                            <td className="px-3 py-3.5 text-center text-xs">
                              <span className="rounded bg-muted px-2 py-0.5 border border-line font-medium text-fg-muted">
                                {extraLabel}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center font-mono text-xs text-fg">
                              {p.TotalSubmissions}
                            </td>
                            <td className="px-3 py-3.5 text-center font-mono text-xs text-ok font-semibold">
                              {p.TotalAC}
                            </td>
                            <td className="px-3 py-3.5 text-center font-mono text-xs text-bad">
                              {p.TotalFailed}
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <Badge kind={p.PassRatePercent >= 50 ? "ok" : "warn"}>
                                {p.PassRatePercent.toFixed(1)}%
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}

                      {problems.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-5 py-12 text-center text-fg-muted">
                            Chưa có bài tập nào trong danh sách.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
