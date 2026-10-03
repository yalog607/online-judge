"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { classRepository } from "./repo";
import { createClassSchema, joinClassSchema } from "./schema";

export type FormState = { error?: string; ok?: boolean; message?: string };

export async function createClassAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const actor = await requireRole("Teacher", "Admin");
  const rawData = {
    className: formData.get("className"),
    description: formData.get("description") || undefined,
    isPublic: formData.get("isPublic") === "true" || formData.get("isPublic") === "on",
    inviteCode: formData.get("inviteCode") || undefined,
  };

  const parsed = createClassSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
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

export async function joinClassAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const rawData = {
    inviteCode: formData.get("inviteCode"),
  };

  const parsed = joinClassSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const classId = await classRepository.joinByInviteCode(
      user.userId,
      parsed.data.inviteCode
    );
    revalidatePath("/user/classes");
    redirect(`/user/classes/${classId}`);
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function leaveClassAction(classId: number): Promise<void> {
  const user = await requireUser();
  await classRepository.leaveClass(user.userId, classId);
  revalidatePath("/user/classes");
  redirect("/user/classes");
}

export async function addStudentAction(
  classId: number,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const actor = await requireRole("Teacher", "Admin");
  const identifier = String(formData.get("identifier") || "").trim();
  if (!identifier) {
    return { error: "Vui lòng nhập email hoặc tên đăng nhập của học sinh." };
  }

  try {
    await classRepository.addStudent(classId, actor.userId, identifier);
    revalidatePath(`/teacher/classes/${classId}`);
    return { ok: true, message: "Thêm học sinh vào lớp thành công!" };
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function removeStudentAction(
  classId: number,
  studentId: number
): Promise<void> {
  const actor = await requireRole("Teacher", "Admin");
  await classRepository.removeStudent(classId, actor.userId, studentId);
  revalidatePath(`/teacher/classes/${classId}`);
}
