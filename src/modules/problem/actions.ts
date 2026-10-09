"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { createSubmission } from "@/modules/submission/repo";
import { dispatchSubmission } from "@/modules/judge/service";
import type { FormState } from "@/modules/auth/actions";
import * as repo from "./repo";
import { parseTestcaseZip } from "./testcase-zip";
import { problemFormSchema, submitCodeSchema } from "./schema";
import { functionSpecSchema, validateFunctionTestcase } from "./function-spec";

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

// Reads the function-mode fields (fnName / fnParamName[] / fnParamType[] / fnReturns) and
// checks every testcase against the declared signature so mistakes show up when saving.
function parseFunctionMode(
  formData: FormData,
  judgeMode: "stdin" | "function",
  testcases: { input: string; expectedOutput: string }[],
): { functionSpec: string | null; error?: string } {
  if (judgeMode !== "function") return { functionSpec: null };

  const names = formData.getAll("fnParamName") as string[];
  const types = formData.getAll("fnParamType") as string[];
  const spec = functionSpecSchema.safeParse({
    name: formData.get("fnName"),
    params: names.map((name, i) => ({ name, type: types[i] })),
    returns: formData.get("fnReturns"),
  });
  if (!spec.success) return { functionSpec: null, error: spec.error.issues[0].message };

  for (let i = 0; i < testcases.length; i++) {
    const problem = validateFunctionTestcase(spec.data, testcases[i].input, testcases[i].expectedOutput);
    if (problem) return { functionSpec: null, error: `Testcase #${i + 1}: ${problem}` };
  }
  return { functionSpec: JSON.stringify(spec.data) };
}

export async function createProblemAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("Teacher", "TA", "Admin");
  const parsed = problemFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let testcases;
  try {
    testcases = await collectTestcases(formData);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không đọc được testcase." };
  }
  const fn = parseFunctionMode(formData, parsed.data.judgeMode, testcases);
  if (fn.error) return { error: fn.error };

  let problemId: number;
  try {
    problemId = await repo.createProblem({
      creatorId: actor.userId,
      ...parsed.data,
      functionSpec: fn.functionSpec,
    });
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : "Tạo bài tập thất bại." };
  }

  if (testcases.length > 0) await repo.replaceTestcases(problemId, actor.userId, testcases);
  
  if (actor.role === "TA") {
    redirect(`/user/problems/${problemId}/edit`);
  } else {
    redirect(`/teacher/problems/${problemId}/edit`);
  }
}

export async function updateProblemAction(
  problemId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole("Teacher", "TA", "Admin");
  const parsed = problemFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const testcases = await collectTestcases(formData);
    const fn = parseFunctionMode(formData, parsed.data.judgeMode, testcases);
    if (fn.error) return { error: fn.error };
    await repo.updateProblem({
      problemId,
      actorId: actor.userId,
      ...parsed.data,
      functionSpec: fn.functionSpec,
    });
    if (testcases.length > 0) await repo.replaceTestcases(problemId, actor.userId, testcases);
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : "Cập nhật bài tập thất bại." };
  }
  return { ok: true };
}

export async function setProblemStatusAction(problemId: number, status: repo.ProblemStatus, rejectionReason?: string) {
  const actor = await requireRole("Teacher", "TA", "Admin");
  await repo.setProblemStatus(problemId, actor.userId, status, rejectionReason);
  revalidatePath("/teacher/problems");
  revalidatePath(`/teacher/problems/${problemId}/edit`);
  revalidatePath(`/user/problems/${problemId}/edit`);
  revalidatePath(`/user/problems/${problemId}`);
  revalidatePath("/user/problems");
}

export async function deleteProblemAction(problemId: number) {
  const actor = await requireRole("Teacher", "TA", "Admin");
  await repo.deleteProblem(problemId, actor.userId);
  revalidatePath("/teacher/problems");
  revalidatePath("/user/problems");
}

export async function submitCodeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = submitCodeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const submissionId = await createSubmission({ userId: user.userId, ...parsed.data });
    await dispatchSubmission(submissionId);
    return { ok: true, submissionId };
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : "Nộp bài thất bại." };
  }
}
