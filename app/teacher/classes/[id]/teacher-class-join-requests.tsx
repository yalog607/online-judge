"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ClassJoinRequestItem } from "@/modules/class/repo";
import { reviewJoinRequestAction } from "@/modules/class/actions";

export function TeacherClassJoinRequests({
  requests,
  classId,
}: {
  requests: ClassJoinRequestItem[];
  classId: number;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"All" | "Pending" | "Reviewed">("All");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filteredRequests = requests.filter((r) => {
    if (filter === "Pending") return r.Status === "Pending";
    if (filter === "Reviewed") return r.Status !== "Pending";
    return true;
  });

  const handleReview = (requestId: number, action: "Approve" | "Reject") => {
    setError(null);
    setProcessingId(requestId);

    startTransition(async () => {
      const res = await reviewJoinRequestAction(requestId, action, classId);
      setProcessingId(null);
      if (res.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("All")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === "All"
                ? "bg-primary text-primary-fg"
                : "border border-line bg-surface text-fg-muted hover:text-fg"
            }`}
          >
            Tất cả ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("Pending")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === "Pending"
                ? "bg-primary text-primary-fg"
                : "border border-line bg-surface text-fg-muted hover:text-fg"
            }`}
          >
            Chờ duyệt ({requests.filter((r) => r.Status === "Pending").length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("Reviewed")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === "Reviewed"
                ? "bg-primary text-primary-fg"
                : "border border-line bg-surface text-fg-muted hover:text-fg"
            }`}
          >
            Đã xử lý ({requests.filter((r) => r.Status !== "Pending").length})
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-xs text-danger">
          {error}
        </div>
      )}

      {filteredRequests.length === 0 ? (
        <div className="card p-12 text-center text-fg-muted">
          Không có yêu cầu tham gia nào trong mục này.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-muted text-xs uppercase text-fg-muted">
                <tr>
                  <th className="px-5 py-3">Học viên</th>
                  <th className="px-5 py-3">Thông tin / Lời nhắn</th>
                  <th className="px-5 py-3">Thời gian gửi</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredRequests.map((r) => {
                  const isBusy = processingId === r.RequestID;

                  return (
                    <tr key={r.RequestID} className="hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-fg">{r.FullName}</div>
                        <div className="text-xs text-fg-muted">@{r.Username} • {r.Email}</div>
                      </td>

                      <td className="px-5 py-4 max-w-xs">
                        <div className="text-xs text-fg bg-surface rounded-lg border border-line p-2 whitespace-pre-wrap break-words">
                          {r.Message}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs text-fg-muted whitespace-nowrap">
                        {formatDate(r.CreatedAt)}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {r.Status === "Pending" ? (
                          <span className="rounded-full bg-warn/10 text-warn border border-warn/30 px-2.5 py-0.5 text-xs font-medium">
                            Chờ duyệt
                          </span>
                        ) : r.Status === "Approved" ? (
                          <span className="rounded-full bg-ok/10 text-ok border border-ok/30 px-2.5 py-0.5 text-xs font-medium">
                            Đã duyệt
                          </span>
                        ) : (
                          <span className="rounded-full bg-bad/10 text-bad border border-bad/30 px-2.5 py-0.5 text-xs font-medium">
                            Từ chối
                          </span>
                        )}
                        {r.ReviewedAt && (
                          <div className="mt-1 text-[11px] text-fg-muted">
                            bởi {r.ReviewerName || "Giảng viên"}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {r.Status === "Pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleReview(r.RequestID, "Approve")}
                              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                              {isBusy ? "..." : "Duyệt"}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleReview(r.RequestID, "Reject")}
                              className="rounded-lg border border-danger/40 bg-surface px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-50 transition-colors"
                            >
                              {isBusy ? "..." : "Từ chối"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-fg-muted">Đã xử lý</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
