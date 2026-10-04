"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { uploadFile } from "@/lib/storage";
import { documentRepository } from "./repo";
import { uploadDocumentSchema, validateDocumentFile } from "./schema";

export type DocumentFormState = {
  error?: string;
  ok?: boolean;
  message?: string;
};

export async function uploadDocumentAction(
  _prev: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const user = await requireRole("Teacher", "Admin");

  const classIdRaw = formData.get("classId");
  const classId = Number(classIdRaw);
  if (!classId || Number.isNaN(classId)) {
    return { error: "Mã lớp học không hợp lệ." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "Vui lòng chọn tập tin tài liệu cần tải lên." };
  }

  const maxSizeBytes = 50 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { error: "Kích thước tập tin vượt quá giới hạn 50MB." };
  }

  const fileType = (formData.get("fileType") as string)?.trim() || null;
  const validation = validateDocumentFile(file.name, fileType);
  if (!validation.valid) {
    return { error: validation.error || "Định dạng tập tin không hợp lệ." };
  }

  let fileName = (formData.get("fileName") as string)?.trim() || "";
  if (!fileName) {
    fileName = file.name;
  }

  const category = (formData.get("category") as string)?.trim() || null;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const cloudinaryUrl = await uploadFile(buffer, `classes/${classId}/documents`, file.name);

    const parsed = uploadDocumentSchema.safeParse({
      fileName,
      cloudinaryUrl,
      category,
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    await documentRepository.addDocument(classId, user.userId, parsed.data);
    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath(`/user/classes/${classId}`);
    return { ok: true, message: "Tải lên tài liệu thành công." };
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    return { error: "Không thể tải lên tài liệu. Vui lòng kiểm tra lại dịch vụ lưu trữ." };
  }
}

export async function deleteDocumentAction(
  documentId: number,
  classId: number
): Promise<DocumentFormState> {
  const user = await requireRole("Teacher", "Admin");

  try {
    await documentRepository.deleteDocument(documentId, user.userId);
    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath(`/user/classes/${classId}`);
    return { ok: true, message: "Xóa tài liệu thành công." };
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    return { error: "Không thể xóa tài liệu." };
  }
}
