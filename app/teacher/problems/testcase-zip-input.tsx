"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Ô chọn file ZIP testcase: bấm hoặc kéo thả, hiện tên file đã chọn và cho bỏ chọn.
export function TestcaseZipInput({ name = "testcaseZip" }: { name?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (picked: File | null) => {
    setError(null);
    if (!picked) {
      setFile(null);
      return;
    }
    if (!picked.name.toLowerCase().endsWith(".zip")) {
      setError("Chỉ nhận file .zip.");
      if (inputRef.current) inputRef.current.value = "";
      setFile(null);
      return;
    }
    setFile(picked);
  };

  const clear = () => {
    if (inputRef.current) inputRef.current.value = "";
    setFile(null);
    setError(null);
  };

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <span className="text-sm font-medium text-fg-muted">
        Hoặc tải file .zip testcase (mỗi cặp file cùng tên, ví dụ 1.in và 1.out)
      </span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files?.[0] ?? null;
          if (dropped && inputRef.current) {
            const dt = new DataTransfer();
            dt.items.add(dropped);
            inputRef.current.files = dt.files;
          }
          pick(dropped);
        }}
        className={`flex flex-wrap items-center gap-3 rounded-lg border border-dashed px-4 py-3 transition-colors ${
          dragging ? "border-primary bg-primary-soft" : "border-line bg-muted/50"
        }`}
      >
        <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-surface text-primary">
          <Icon name="upload" size={18} />
        </span>
        <div className="min-w-0 flex-1 text-sm">
          {file ? (
            <>
              <div className="truncate font-medium text-fg">{file.name}</div>
              <div className="text-xs text-fg-muted">{formatSize(file.size)}</div>
            </>
          ) : (
            <>
              <div className="font-medium text-fg">Kéo thả file .zip vào đây</div>
              <div className="text-xs text-fg-muted">hoặc bấm “Chọn file”. Testcase từ ZIP mặc định là testcase ẩn.</div>
            </>
          )}
        </div>
        {file && (
          <button
            type="button"
            onClick={clear}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-bad hover:bg-muted"
          >
            Bỏ chọn
          </button>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-fg hover:opacity-90"
        >
          {file ? "Đổi file" : "Chọn file"}
        </button>
        <input
          ref={inputRef}
          name={name}
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
