"use server";

import { redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { createSubmission } from "@/modules/submission/repo";
import type { FormState } from "@/modules/auth/actions";
import * as repo from "./repo";
import { parseTestcaseZip } from "./testcase-zip";
import { problemFormSchema, submitCodeSchema } from "./schema";

function parseManualTestcases(formData: FormData) {
  const inputs = formData.getAll("tcInput") as string[];
  const outputs = formData.getAll("tcOutput") as string[];
  const hiddenFlags = formData.getAll("tcHidden") as string[];
  return inputs
    .map((input, i) => ({
      input,
      expectedOutput: outputs[i] ?? "",
      isHidden: hiddenFlags[i] === "true",
    }))
    .filter((tc) => tc.input.trim() || tc.expectedOutput.trim());
}

async function collectTestcases(formData: FormData) {
  const manual = parseManualTestcases(formData);
  const zip = formData.get("testcaseZip");
  if (zip instanceof File && zip.size > 0) {
    const parsed = await parseTestcaseZip(Buffer.from(await zip.arrayBuffer()));
    return [...manual, ...parsed];
  }
  return manual;
}

export async function createProblemAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("Teacher", "Admin");
  const parsed = problemFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let problemId: number;
  try {
    problemId = await repo.createProblem({ creatorId: actor.userId, ...parsed.data });
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : "Tạo bài tập thất bại." };
  }

  const testcases = await collectTestcases(formData);
  if (testcases.length > 0) await repo.replaceTestcases(problemId, actor.userId, testcases);
  redirect(`/teacher/problems/${problemId}`);
}

export async function updateProblemAction(
  problemId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("Teacher", "Admin");
  const parsed = problemFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await repo.updateProblem({ problemId, actorId: actor.userId, ...parsed.data });
    const testcases = await collectTestcases(formData);
    if (testcases.length > 0) await repo.replaceTestcases(problemId, actor.userId, testcases);
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : "Cập nhật bài tập thất bại." };
  }
  return { ok: true };
}

export async function setProblemStatusAction(problemId: number, status: repo.ProblemStatus) {
  const actor = await requireRole("Teacher", "Admin");
  await repo.setProblemStatus(problemId, actor.userId, status);
}

export async function deleteProblemAction(problemId: number) {
  const actor = await requireRole("Teacher", "Admin");
  await repo.deleteProblem(problemId, actor.userId);
}

export async function submitCodeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = submitCodeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const submissionId = await createSubmission({ userId: user.userId, ...parsed.data });
    return { ok: true, submissionId };
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : "Nộp bài thất bại." };
  }
}
