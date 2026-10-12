"use client";

import { useState } from "react";

export function ExportStudentsButton({
  classId,
  className,
}: {
  classId: number;
  className?: string;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);

      const response = await fetch(`/api/classes/${classId}/students/export`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Không thể xuất danh sách học viên."
        );
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `Danh_sach_lop_${classId}.xlsx`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi xuất file.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        disabled={isExporting}
        onClick={handleExport}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold text-fg hover:bg-muted transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ""}`}
      >
        {isExporting ? (
          <svg
            className="h-4 w-4 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
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
        ) : (
          <svg
            className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
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
        )}
        <span>{isExporting ? "Đang xuất..." : "Xuất Excel"}</span>
      </button>

      {error && (
        <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-bad/30 bg-bad/10 p-2.5 text-xs text-bad shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
