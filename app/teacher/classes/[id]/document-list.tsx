"use client";

import { useTransition } from "react";
import { deleteDocumentAction } from "@/modules/document/actions";
import type { DocumentItem } from "@/modules/document/repo";

function getFormatTag(fileName: string, url: string) {
  const extFromFileName = fileName.includes(".") ? fileName.split(".").pop() : "";
  const extFromUrl = url.includes(".") ? url.split(".").pop()?.split("?")[0] : "";
  const ext = (extFromFileName || extFromUrl || "FILE").toUpperCase();
  return ext.length > 5 ? "FILE" : ext;
}

export function TeacherDocumentList({
  classId,
  documents,
}: {
  classId: number;
  documents: DocumentItem[];
}) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (documentId: number, fileName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài liệu "${fileName}"?`)) return;
    startTransition(async () => {
      await deleteDocumentAction(documentId, classId);
    });
  };

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line bg-muted font-medium text-fg-muted">
          <tr>
            <th className="px-4 py-3">STT</th>
            <th className="px-4 py-3">Tài liệu</th>
            <th className="px-4 py-3">Định dạng</th>
            <th className="px-4 py-3">Phân loại</th>
            <th className="px-4 py-3">Ngày đăng</th>
            <th className="px-4 py-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {documents.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-fg-muted">
                Chưa có tài liệu nào trong lớp học này.
              </td>
            </tr>
          ) : (
            documents.map((doc, idx) => {
              const format = getFormatTag(doc.FileName, doc.CloudinaryURL);
              return (
                <tr key={doc.DocumentID} className="hover:bg-muted/50">
                  <td className="px-4 py-3 text-fg-muted">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-fg">
                    <a
                      href={doc.CloudinaryURL}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-primary hover:underline flex items-center gap-2"
                    >
                      <span>{doc.FileName}</span>
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded border border-line bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-fg">
                      {format}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs text-fg-muted">
                      {doc.Category || "Chung"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {new Date(doc.UploadDate).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <a
                        href={doc.CloudinaryURL}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Tải về
                      </a>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(doc.DocumentID, doc.FileName)}
                        className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
