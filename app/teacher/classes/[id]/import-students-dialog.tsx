"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ImportStudentsSummary } from "@/modules/class/repo";
import { Modal } from "@/components/modal";

export function ImportStudentsDialog({
  classId,
  className,
}: {
  classId: number;
  className?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportStudentsSummary | null>(null);

  const handleOpen = () => {
    setError(null);
    setSummary(null);
    setSelectedFile(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (summary && summary.successCount > 0) {
      router.refresh();
    }
    setIsOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Vui lòng chọn một tệp Excel.");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`/api/classes/${classId}/students/import`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể tải lên danh sách học viên.");
      }

      setSummary(data.data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải lên.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetForNewUpload = () => {
    setSummary(null);
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold text-fg hover:bg-muted transition-colors cursor-pointer ${className ?? ""}`}
      >
        <svg
          className="h-4 w-4 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        <span>Import Excel</span>
      </button>

      <Modal isOpen={isOpen} onClose={handleClose}>
        <div className="w-full max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-fg">
                    Nhập danh sách học viên từ Excel
                  </h3>
                  <p className="text-xs text-fg-muted">
                    Thêm hàng loạt học sinh vào lớp học bằng tệp định dạng .xlsx
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-fg-muted hover:text-fg text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-bad/10 border border-bad/30 p-3 text-xs text-bad">
                {error}
              </div>
            )}

            {!summary ? (
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 border border-line">
                  <div className="text-xs text-fg-muted">
                    Chưa có tệp chuẩn? Sử dụng tệp mẫu của hệ thống:
                  </div>
                  <a
                    href={`/api/classes/${classId}/students/import-template`}
                    download
                    className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1.5 text-xs font-semibold text-primary border border-line hover:bg-muted transition-colors"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Tải tệp mẫu (.xlsx)
                  </a>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-muted/20 p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/40 transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  {selectedFile ? (
                    <div>
                      <div className="text-sm font-semibold text-fg">
                        {selectedFile.name}
                      </div>
                      <div className="text-xs text-fg-muted mt-1">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Nhấn để đổi tệp
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-semibold text-fg">
                        Nhấn để chọn tệp Excel hoặc kéo thả vào đây
                      </div>
                      <div className="text-xs text-fg-muted mt-1">
                        Hỗ trợ tệp .xlsx hoặc .xls (tối đa 5MB)
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isUploading}
                    className="rounded-lg border border-line bg-muted px-4 py-2 text-xs font-semibold text-fg hover:bg-muted/80 transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={!selectedFile || isUploading}
                    onClick={handleUpload}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-fg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <span>Bắt đầu nhập</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-line bg-surface p-3 text-center">
                    <div className="text-[11px] font-medium text-fg-muted uppercase">
                      Tổng số dòng
                    </div>
                    <div className="mt-1 text-lg font-bold text-fg">
                      {summary.total}
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
                    <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase">
                      Thành công
                    </div>
                    <div className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {summary.successCount}
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center">
                    <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase">
                      Đã ở trong lớp
                    </div>
                    <div className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
                      {summary.alreadyExistsCount}
                    </div>
                  </div>
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-center">
                    <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase">
                      Không tìm thấy
                    </div>
                    <div className="mt-1 text-lg font-bold text-rose-600 dark:text-rose-400">
                      {summary.notFoundCount}
                    </div>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto rounded-xl border border-line">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 border-b border-line bg-muted font-medium text-fg-muted">
                      <tr>
                        <th className="px-3 py-2">Dòng</th>
                        <th className="px-3 py-2">Thông tin nhập</th>
                        <th className="px-3 py-2">Tài khoản</th>
                        <th className="px-3 py-2 text-right">Kết quả</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {summary.results.map((r) => {
                        let statusBadge = (
                          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                            Thành công
                          </span>
                        );
                        if (r.status === "ALREADY_EXISTS") {
                          statusBadge = (
                            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-400">
                              Đã trong lớp
                            </span>
                          );
                        } else if (r.status === "NOT_FOUND") {
                          statusBadge = (
                            <span className="rounded-md bg-rose-500/10 px-2 py-0.5 font-medium text-rose-600 dark:text-rose-400">
                              Không tìm thấy
                            </span>
                          );
                        } else if (r.status === "CANNOT_ADD_TEACHER") {
                          statusBadge = (
                            <span className="rounded-md bg-purple-500/10 px-2 py-0.5 font-medium text-purple-600 dark:text-purple-400">
                              Giảng viên
                            </span>
                          );
                        } else if (r.status === "DUPLICATE_IN_FILE") {
                          statusBadge = (
                            <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-fg-muted">
                              Trùng trong tệp
                            </span>
                          );
                        }

                        return (
                          <tr key={r.rowOrder} className="hover:bg-muted/40">
                            <td className="px-3 py-2 text-fg-muted">{r.rowOrder}</td>
                            <td className="px-3 py-2 font-mono font-medium text-fg">
                              {r.identifier}
                            </td>
                            <td className="px-3 py-2 text-fg-muted">
                              {r.fullName ? (
                                <span>
                                  {r.fullName} <span className="text-[10px]">(@{r.username})</span>
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">{statusBadge}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={handleResetForNewUpload}
                    className="rounded-lg border border-line bg-muted px-3 py-1.5 text-xs font-semibold text-fg hover:bg-muted/80 transition-colors cursor-pointer"
                  >
                    ← Nhập tệp khác
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-fg hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Hoàn tất
                  </button>
                </div>
              </div>
            )}
        </div>
      </Modal>
    </>
  );
}
