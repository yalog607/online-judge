"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { classRepository } from "./repo";
import { notifyStudentAdded, notifyStudentRemoved } from "@/modules/notification/events";
import { createClassSchema, joinClassSchema, updateClassSchema } from "./schema";
import { firstIssue } from "@/lib/form-errors";

export type FormState = { error?: string; field?: string; ok?: boolean; message?: string };

export async function createClassAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireRole("Teacher", "Admin");
  const rawData = {
    className: formData.get("className"),
    description: formData.get("description") || undefined,
    isPublic: formData.get("isPublic") === "true" || formData.get("isPublic") === "on",
    inviteCode: formData.get("inviteCode") || undefined,
  };

  const parsed = createClassSchema.safeParse(rawData);
  if (!parsed.success) {
    return firstIssue(parsed.error);
  }

  try {
    const { classId } = await classRepository.createClass(actor.userId, parsed.data);
    revalidatePath("/teacher/classes");
    redirect(`/teacher/classes/${classId}`);
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}

function classHomePath(role: string, classId: number): string {
  return role === "Teacher" || role === "Admin"
    ? `/teacher/classes/${classId}`
    : `/user/classes/${classId}`;
}

export async function joinClassAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("User", "TA", "Teacher", "Admin");
  const rawData = {
    inviteCode: formData.get("inviteCode"),
  };

  const parsed = joinClassSchema.safeParse(rawData);
  if (!parsed.success) {
    return firstIssue(parsed.error);
  }

  try {
    const classId = await classRepository.joinByInviteCode(user.userId, parsed.data.inviteCode);
    revalidatePath(user.role === "Teacher" ? "/teacher/classes" : "/user/classes");
    redirect(classHomePath(user.role, classId));
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function joinPublicClassAction(classId: number): Promise<void> {
  const user = await requireRole("User", "TA", "Teacher", "Admin");
  await classRepository.joinPublicClass(user.userId, classId);
  revalidatePath(user.role === "Teacher" ? "/teacher/classes" : "/user/classes");
  revalidatePath(`/user/classes/${classId}`);
  revalidatePath(`/teacher/classes/${classId}`);
  redirect(classHomePath(user.role, classId));
}

export async function leaveClassAction(classId: number): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireRole("User", "TA", "Teacher", "Admin");
  try {
    await classRepository.leaveClass(user.userId, classId);
    revalidatePath(user.role === "Teacher" ? "/teacher/classes" : "/user/classes");
    return { ok: true };
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function addStudentAction(
  classId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("Teacher", "Admin");
  const identifier = String(formData.get("identifier") || "").trim();
  if (!identifier) {
    return { error: "Vui lòng nhập email hoặc tên đăng nhập của học sinh." };
  }

  try {
    const studentId = await classRepository.addStudent(classId, actor.userId, identifier);
    await notifyStudentAdded(classId, studentId);
    revalidatePath(`/teacher/classes/${classId}`);
    return { ok: true, message: "Thêm học sinh vào lớp thành công!" };
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function removeStudentAction(classId: number, studentId: number): Promise<void> {
  const actor = await requireRole("Teacher", "Admin");
  await classRepository.removeStudent(classId, actor.userId, studentId);
  await notifyStudentRemoved(classId, studentId);
  revalidatePath(`/teacher/classes/${classId}`);
}

export async function updateClassAction(
  classId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("Teacher", "Admin");
  const rawData = {
    className: formData.get("className"),
    description: formData.get("description") || null,
    isPublic: formData.get("isPublic") === "true" || formData.get("isPublic") === "on",
  };

  const parsed = updateClassSchema.safeParse(rawData);
  if (!parsed.success) {
    return firstIssue(parsed.error);
  }

  try {
    await classRepository.updateClass(actor.userId, classId, parsed.data);
    revalidatePath("/teacher/classes");
    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath(`/user/classes/${classId}`);
    return { ok: true, message: "Cập nhật thông tin lớp học thành công!" };
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function cancelClassAction(
  classId: number,
): Promise<{ error?: string; ok?: boolean }> {
  const actor = await requireRole("Teacher", "Admin");
  try {
    await classRepository.cancelClass(classId, actor.userId);
    revalidatePath("/teacher/classes");
    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath("/user/classes");
    revalidatePath(`/user/classes/${classId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof DomainError) return { error: error.message };
    throw error;
  }
}

export async function resubmitClassAction(
  classId: number,
): Promise<{ error?: string; ok?: boolean }> {
  const actor = await requireRole("Teacher", "Admin");
  try {
    await classRepository.resubmitClass(classId, actor.userId);
    revalidatePath("/teacher/classes");
    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath("/admin/approvals");
    return { ok: true };
  } catch (error) {
    if (error instanceof DomainError) return { error: error.message };
    throw error;
  }
}

export async function assignClassProblemAction(
  classId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("Teacher", "TA", "Admin");
  const problemId = Number(formData.get("problemId"));
  const dueDate = formData.get("dueDate") as string | null;

  if (!problemId || isNaN(problemId)) {
    return { error: "Vui lòng chọn bài tập hợp lệ." };
  }

  try {
    await classRepository.assignProblem(classId, actor.userId, problemId, dueDate || null);
    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath(`/user/classes/${classId}`);
    return { ok: true, message: "Giao bài tập cho lớp thành công!" };
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function removeClassProblemAction(
  classId: number,
  problemId: number,
): Promise<{ ok?: boolean; error?: string }> {
  const actor = await requireRole("Teacher", "TA", "Admin");

  try {
    await classRepository.removeProblem(classId, actor.userId, problemId);
    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath(`/user/classes/${classId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function requestTAUpgradeAction(
  classId: number,
  studentId: number,
): Promise<{ ok?: boolean; error?: string }> {
  const actor = await requireRole("Teacher", "Admin");

  try {
    await classRepository.requestUpgradeToTA(classId, actor.userId, studentId);
    revalidatePath(`/teacher/classes/${classId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function approveTARequestAction(
  requestId: number,
  isApproved: boolean,
  rejectionReason?: string,
): Promise<{ ok?: boolean; error?: string }> {
  const actor = await requireRole("Admin");

  try {
    await classRepository.approveTARequest(actor.userId, requestId, isApproved, rejectionReason);
    revalidatePath("/admin/approvals");
    return { ok: true };
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function approveClassRequestAction(
  classId: number,
  isApproved: boolean,
  rejectionReason?: string,
): Promise<{ ok?: boolean; error?: string }> {
  const actor = await requireRole("Admin");

  try {
    await classRepository.approveClassRequest(actor.userId, classId, isApproved, rejectionReason);
    revalidatePath("/admin/approvals");
    return { ok: true };
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}
