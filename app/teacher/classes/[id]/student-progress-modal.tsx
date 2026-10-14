"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DifficultyBadge } from "@/components/badge";
import { Modal } from "@/components/modal";
import type { StudentProgressDetailData } from "@/modules/class/repo";

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-indigo-600",
];

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export function StudentProgressModal({
  classId,
  student,
  onClose,
}: {
  classId: number;
  student: {
    UserID: number;
    FullName: string;
    Username?: string;
    Email?: string;
    IsTA?: boolean;
  } | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<StudentProgressDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"problems" | "submissions">("problems");

  useEffect(() => {
    if (!student) return;

    let isMounted = true;

    fetch(`/api/classes/${classId}/students/${student.UserID}/progress`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Không thể tải chi tiết tiến độ.");
        }
        return json.data;
      })
      .then((detail) => {
        if (isMounted) {
          setData(detail);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Lỗi tải dữ liệu tiến độ.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [classId, student]);

  if (!student) return null;

  const initial = student.FullName.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ?? "?";
  const avatarColor = getAvatarColor(student.UserID);

  return (
    <Modal isOpen={Boolean(student)} onClose={onClose}>
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3.5">
            <span
              className={`grid h-11 w-11 flex-none place-items-center rounded-full text-base font-bold text-white shadow-xs ${avatarColor}`}
            >
              {initial}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-fg">{student.FullName}</h2>
                {student.IsTA && (
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    Trợ giảng
                  </span>
                )}
              </div>
              <p className="text-xs text-fg-muted">
                {student.Username ? `@${student.Username}` : ""}
                {student.Username && student.Email ? " · " : ""}
                {student.Email || ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-8 w-8 place-items-center rounded-lg text-fg-muted hover:bg-muted hover:text-fg transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-fg-muted">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
              <p className="text-sm">Đang tải chi tiết tiến độ sinh viên...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
              {error}
            </div>
          )}

          {!loading && !error && data && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="card rounded-xl border border-line bg-surface p-4 shadow-2xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                    Tiến độ hoàn thành
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {data.student.ProgressPercent}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, data.student.ProgressPercent))}%` }}
                    />
                  </div>
                </div>

                <div className="card rounded-xl border border-line bg-surface p-4 shadow-2xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                    Bài tập đã giải
                  </span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-fg">
                      {data.student.SolvedProblems}
                    </span>
                    <span className="text-xs text-fg-muted">
                      / {data.student.TotalProblems} bài
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Đạt yêu cầu (AC)
                  </p>
                </div>

                <div className="card rounded-xl border border-line bg-surface p-4 shadow-2xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                    Đang thử sức
                  </span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {data.student.AttemptedProblems}
                    </span>
                    <span className="text-xs text-fg-muted">
                      / {data.student.TotalProblems} bài
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-fg-muted">
                    Chưa đạt kết quả tối đa
                  </p>
                </div>

                <div className="card rounded-xl border border-line bg-surface p-4 shadow-2xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                    Tổng lượt nộp bài
                  </span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-primary">
                      {data.student.TotalSubmissions}
                    </span>
                    <span className="text-xs text-fg-muted">lượt</span>
                  </div>
                  <p className="mt-1 text-[11px] text-fg-muted">
                    {data.student.TotalAC} lượt nộp đạt AC
                  </p>
                </div>
              </div>

              <div className="flex border-b border-line gap-6 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab("problems")}
                  className={`pb-3 transition-colors ${
                    activeTab === "problems"
                      ? "border-b-2 border-primary text-primary"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  Bài tập trong lớp ({data.problems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("submissions")}
                  className={`pb-3 transition-colors ${
                    activeTab === "submissions"
                      ? "border-b-2 border-primary text-primary"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  Lịch sử nộp bài ({data.submissions.length})
                </button>
              </div>

              {activeTab === "problems" && (
                <div className="card overflow-hidden rounded-xl border border-line">
                  {data.problems.length === 0 ? (
                    <div className="p-8 text-center text-sm text-fg-muted">
                      Lớp học chưa giao bài tập nào.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-line bg-muted font-medium text-fg-muted uppercase text-[10px]">
                          <tr>
                            <th className="px-4 py-3">STT</th>
                            <th className="px-4 py-3">Bài tập</th>
                            <th className="px-4 py-3">Độ khó</th>
                            <th className="px-4 py-3">Trạng thái</th>
                            <th className="px-4 py-3">Kết quả tốt nhất</th>
                            <th className="px-4 py-3 text-center">Số lượt nộp</th>
                            <th className="px-4 py-3 text-right">Lần nộp cuối</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {data.problems.map((p, idx) => (
                            <tr key={p.ProblemID} className="hover:bg-muted/40 transition-colors">
                              <td className="px-4 py-3 text-fg-muted">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <Link
                                  href={`/teacher/problems/${p.ProblemID}`}
                                  target="_blank"
                                  className="font-semibold text-fg hover:text-primary hover:underline"
                                >
                                  {p.Title}
                                </Link>
                                <div className="text-[11px] text-fg-muted">
                                  Giới hạn: {(p.TimeLimit / 1000).toFixed(1)}s · {p.MemoryLimit}MB
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <DifficultyBadge value={p.Difficulty} />
                              </td>
                              <td className="px-4 py-3">
                                {p.Status === "Solved" ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Đã giải quyết
                                  </span>
                                ) : p.Status === "Attempted" ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    Đang thử sức
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-fg-muted">
                                    <span className="h-1.5 w-1.5 rounded-full bg-fg-muted/60" />
                                    Chưa làm
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {p.BestResult ? (
                                  <span
                                    className={`inline-block font-mono font-bold text-xs ${
                                      p.BestResult === "AC"
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-rose-600 dark:text-rose-400"
                                    }`}
                                  >
                                    {p.BestResult}
                                  </span>
                                ) : (
                                  <span className="text-fg-muted">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center font-mono font-medium">
                                {p.SubmissionCount}
                              </td>
                              <td className="px-4 py-3 text-right text-fg-muted whitespace-nowrap">
                                {p.LastSubmitTime
                                  ? new Date(p.LastSubmitTime).toLocaleString("vi-VN", {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    })
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "submissions" && (
                <div className="card overflow-hidden rounded-xl border border-line">
                  {data.submissions.length === 0 ? (
                    <div className="p-8 text-center text-sm text-fg-muted">
                      Sinh viên chưa nộp bài nào cho các bài tập của lớp này.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-line bg-muted font-medium text-fg-muted uppercase text-[10px]">
                          <tr>
                            <th className="px-4 py-3">Mã nộp</th>
                            <th className="px-4 py-3">Bài tập</th>
                            <th className="px-4 py-3">Ngôn ngữ</th>
                            <th className="px-4 py-3">Kết quả</th>
                            <th className="px-4 py-3">Thời gian</th>
                            <th className="px-4 py-3">Bộ nhớ</th>
                            <th className="px-4 py-3">Thời điểm nộp</th>
                            <th className="px-4 py-3 text-right">Chi tiết</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {data.submissions.map((s) => (
                            <tr key={s.SubmissionID} className="hover:bg-muted/40 transition-colors">
                              <td className="px-4 py-3 font-mono font-bold text-fg-muted">
                                #{s.SubmissionID}
                              </td>
                              <td className="px-4 py-3 font-medium text-fg">
                                {s.ProblemTitle}
                              </td>
                              <td className="px-4 py-3 text-fg-muted">{s.Language}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-block font-mono font-bold text-xs ${
                                    s.Result === "AC"
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {s.Result}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-fg-muted font-mono">
                                {s.Runtime != null ? `${s.Runtime} ms` : "-"}
                              </td>
                              <td className="px-4 py-3 text-fg-muted font-mono">
                                {s.Memory != null ? `${s.Memory} MB` : "-"}
                              </td>
                              <td className="px-4 py-3 text-fg-muted whitespace-nowrap">
                                {new Date(s.SubmitTime).toLocaleString("vi-VN", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Link
                                  href={`/submissions/${s.SubmissionID}`}
                                  target="_blank"
                                  className="font-medium text-primary hover:underline"
                                >
                                  Xem bài làm →
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end border-t border-line bg-muted/30 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line bg-surface px-4 py-2 text-xs font-semibold text-fg hover:bg-muted transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
}
