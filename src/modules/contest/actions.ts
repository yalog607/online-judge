"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { contestRepository } from "./repo";
import {
  createContestSchema,
  updateContestSchema,
  addContestProblemSchema,
  joinContestSchema,
} from "./schema";

export type ContestFormState = { error?: string; ok?: boolean; message?: string; contestId?: number };

export async function createContestAction(
  _prev: ContestFormState,
  formData: FormData
): Promise<ContestFormState> {
  const actor = await requireRole("Teacher", "Admin");
  const rawData = {
    contestName: formData.get("contestName"),
    description: formData.get("description") || undefined,
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    password: formData.get("password") || undefined,
    classId: formData.get("classId") || undefined,
  };

  const parsed = createContestSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  let newId: number;
  try {
    const { contestId } = await contestRepository.createContest(actor.userId, parsed.data);
    newId = contestId;
    revalidatePath("/teacher/contests");
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/teacher/contests/${newId}`);
}

export async function updateContestAction(
  contestId: number,
  _prev: ContestFormState,
  formData: FormData
): Promise<ContestFormState> {
  const actor = await requireRole("Teacher", "Admin");
  const rawData = {
    contestName: formData.get("contestName"),
    description: formData.get("description") || undefined,
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    password: formData.get("password") || undefined,
    classId: formData.get("classId") || undefined,
  };

  const parsed = updateContestSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await contestRepository.updateContest(contestId, actor.userId, parsed.data);
    revalidatePath(`/teacher/contests/${contestId}`);
    revalidatePath("/teacher/contests");
    return { ok: true, message: "Cập nhật kỳ thi thành công" };
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function addContestProblemAction(
  contestId: number,
  _prev: ContestFormState,
  formData: FormData
): Promise<ContestFormState> {
  const actor = await requireRole("Teacher", "Admin");
  const rawData = {
    problemId: formData.get("problemId"),
    maxScore: formData.get("maxScore") || 100,
    orderIndex: formData.get("orderIndex") || 0,
  };

  const parsed = addContestProblemSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await contestRepository.addProblem(contestId, actor.userId, parsed.data);
    revalidatePath(`/teacher/contests/${contestId}`);
    return { ok: true, message: "Thêm bài tập vào kỳ thi thành công" };
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function removeContestProblemAction(
  contestId: number,
  problemId: number
): Promise<{ error?: string; ok?: boolean }> {
  const actor = await requireRole("Teacher", "Admin");

  try {
    await contestRepository.removeProblem(contestId, problemId, actor.userId);
    revalidatePath(`/teacher/contests/${contestId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function joinContestAction(
  contestId: number,
  _prev: ContestFormState,
  formData: FormData
): Promise<ContestFormState> {
  const user = await requireUser();
  const rawData = {
    password: formData.get("password") || undefined,
  };

  const parsed = joinContestSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await contestRepository.joinContest(contestId, user.userId, parsed.data.password);
    revalidatePath(`/user/contests/${contestId}`);
    revalidatePath("/user/contests");
    return { ok: true, message: "Tham gia kỳ thi thành công" };
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message };
    }
    throw error;
  }
}
