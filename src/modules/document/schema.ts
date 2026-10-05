import { z } from "zod";

export const ALLOWED_DOCUMENT_TYPES = {
  pdf: {
    label: "Tài liệu PDF (.pdf)",
    extensions: [".pdf"],
    accept: ".pdf,application/pdf",
  },
  word: {
    label: "Tài liệu Word (.doc, .docx)",
    extensions: [".doc", ".docx"],
    accept: ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  powerpoint: {
    label: "Slide PowerPoint (.ppt, .pptx)",
    extensions: [".ppt", ".pptx"],
    accept: ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
  excel: {
    label: "Bảng tính Excel (.xls, .xlsx)",
    extensions: [".xls", ".xlsx"],
    accept: ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  archive: {
    label: "Tập tin nén (.zip, .rar, .7z)",
    extensions: [".zip", ".rar", ".7z"],
    accept: ".zip,.rar,.7z,application/zip,application/x-zip-compressed",
  },
  code: {
    label: "Mã nguồn / Văn bản (.cpp, .c, .py, .java, .txt)",
    extensions: [".cpp", ".c", ".py", ".java", ".txt"],
    accept: ".cpp,.c,.py,.java,.txt,text/plain",
  },
} as const;

export type DocumentTypeKey = keyof typeof ALLOWED_DOCUMENT_TYPES;

export const ALL_ALLOWED_EXTENSIONS = Object.values(ALLOWED_DOCUMENT_TYPES).flatMap(
  (t) => t.extensions
);

export function getFileExtension(fileName: string): string {
  const lastIndex = fileName.lastIndexOf(".");
  if (lastIndex === -1) return "";
  return fileName.slice(lastIndex).toLowerCase();
}

export function validateDocumentFile(
  fileName: string,
  typeKey?: string | null
): { valid: boolean; error?: string } {
  const ext = getFileExtension(fileName);
  if (!ext) {
    return { valid: false, error: "Tập tin không có phần mở rộng hợp lệ." };
  }

  if (typeKey && typeKey in ALLOWED_DOCUMENT_TYPES) {
    const config = ALLOWED_DOCUMENT_TYPES[typeKey as DocumentTypeKey];
    const isAllowed = config.extensions.some((allowedExt) => allowedExt === ext);
    if (!isAllowed) {
      return {
        valid: false,
        error: `Định dạng tập tin (${ext}) không khớp với loại đã chọn (${config.label}). Yêu cầu: ${config.extensions.join(", ")}`,
      };
    }
    return { valid: true };
  }

  const isAllowedAny = ALL_ALLOWED_EXTENSIONS.some((allowedExt) => allowedExt === ext);
  if (!isAllowedAny) {
    return {
      valid: false,
      error: `Định dạng tập tin (${ext}) không được hỗ trợ. Các định dạng cho phép: ${ALL_ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  return { valid: true };
}

export const uploadDocumentSchema = z.object({
  fileName: z.string().trim().min(1, "Tên tài liệu không được để trống").max(255),
  cloudinaryUrl: z.string().trim().min(1, "Đường dẫn tài liệu không hợp lệ").max(2048),
  category: z.string().trim().max(50).optional().nullable(),
});

export const listDocumentQuerySchema = z.object({
  category: z.string().trim().max(50).optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type ListDocumentQuery = z.infer<typeof listDocumentQuerySchema>;
