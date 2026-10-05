"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ALLOWED_DOCUMENT_TYPES,
  type DocumentTypeKey,
  validateDocumentFile,
} from "@/modules/document/schema";

export function DocumentUploadForm({ classId }: { classId: number }) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string>("pdf");
  const [fileName, setFileName] = useState<string>("" );
  const [category, setCategory] = useState<string>("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  const activeConfig =
    selectedType in ALLOWED_DOCUMENT_TYPES
      ? ALLOWED_DOCUMENT_TYPES[selectedType as DocumentTypeKey]
      : null;

  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    setSelectedType(newType);

    if (selectedFileName) {
      const check = validateDocumentFile(selectedFileName, newType || null);
      if (!check.valid) {
        setFileError(check.error || "Định dạng tập tin không hợp lệ.");
      } else {
        setFileError(null);
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setSelectedFileName("");
      setFileError(null);
      return;
    }

    const file = files[0];
    const name = file.name;
    setSelectedFileName(name);

    const maxSizeBytes = 50 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setFileError("Kích thước tập tin vượt quá giới hạn 50MB.");
      e.target.value = "";
      setSelectedFileName("");
      return;
    }

    const check = validateDocumentFile(name, selectedType || null);
    if (!check.valid) {
      setFileError(check.error || "Định dạng tập tin không hợp lệ.");
      e.target.value = "";
      setSelectedFileName("");
      return;
    }

    setFileError(null);
    if (!fileName.trim()) {
      setFileName(name);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatusMessage(null);

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      setFileError("Vui lòng chọn tập tin tài liệu cần tải lên.");
      return;
    }

    const file = fileInput.files[0];
    const check = validateDocumentFile(file.name, selectedType || null);
    if (!check.valid) {
      setFileError(check.error || "Định dạng tập tin không hợp lệ.");
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.includes(".")
        ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
        : "";
      let finalFileName = fileName.trim() || file.name;
      if (ext && !finalFileName.toLowerCase().endsWith(ext)) {
        finalFileName = `${finalFileName}${ext}`;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", selectedType);
      formData.append("fileName", finalFileName);
      if (category.trim()) {
        formData.append("category", category.trim());
      }

      const res = await fetch(`/api/classes/${classId}/documents`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({
          type: "error",
          text: data.error || "Tải lên tài liệu thất bại.",
        });
      } else {
        setStatusMessage({
          type: "ok",
          text: "Tải lên tài liệu thành công!",
        });
        setFileName("");
        setCategory("");
        setSelectedFileName("");
        fileInput.value = "";
        router.refresh();
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Không thể kết nối đến máy chủ khi tải lên tài liệu.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {statusMessage && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            statusMessage.type === "error"
              ? "border-danger/40 bg-danger/10 text-danger"
              : "border-ok/40 bg-ok/10 text-ok"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {fileError && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {fileError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-muted">
            1. Chọn loại tập tin tài liệu <span className="text-danger">*</span>
          </label>
          <select
            name="fileType"
            value={selectedType}
            onChange={handleTypeChange}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary"
          >
            <option value="pdf">Tài liệu PDF (.pdf)</option>
            <option value="word">Văn bản Word (.doc, .docx)</option>
            <option value="powerpoint">Slide PowerPoint (.ppt, .pptx)</option>
            <option value="excel">Bảng tính Excel (.xls, .xlsx)</option>
            <option value="archive">Tập tin nén (.zip, .rar, .7z)</option>
            <option value="code">Mã nguồn / Text (.cpp, .c, .py, .java, .txt)</option>
            <option value="">Tất cả định dạng cho phép</option>
          </select>
          <p className="mt-1 text-xs text-fg-muted">
            Định dạng chấp nhận:{" "}
            <span className="font-mono text-primary font-medium">
              {activeConfig ? activeConfig.extensions.join(", ") : "Tất cả định dạng hỗ trợ"}
            </span>
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-fg-muted">
            2. Tải lên tập tin từ máy tính <span className="text-danger">*</span>
          </label>
          <input
            name="file"
            type="file"
            required
            accept={activeConfig ? activeConfig.accept : undefined}
            onChange={handleFileChange}
            className="w-full text-xs text-fg-muted file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-xs file:font-semibold file:text-fg hover:file:bg-muted/80 cursor-pointer"
          />
          <p className="mt-1 text-xs text-fg-muted">Dung lượng tối đa: 50MB</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-muted">
            3. Tên tài liệu hiển thị <span className="text-danger">*</span>
          </label>
          <input
            name="fileName"
            type="text"
            required
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="VD: Chương 1 - Cấu trúc dữ liệu & Giải thuật"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-fg-muted">
            4. Phân loại nội dung
          </label>
          <input
            name="category"
            type="text"
            list="category-suggestions"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="VD: Bài giảng, Bài tập, Tài liệu tham khảo..."
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary"
          />
          <datalist id="category-suggestions">
            <option value="Bài giảng" />
            <option value="Bài tập" />
            <option value="Tài liệu tham khảo" />
            <option value="Đề cương môn học" />
            <option value="Đề thi mẫu" />
          </datalist>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isUploading || !!fileError}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-fg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isUploading ? "Đang tải lên tập tin..." : "Tải lên tài liệu"}
        </button>
      </div>
    </form>
  );
}
