"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { requestRejudge } from "./repo";
import { dispatchSubmission } from "@/modules/judge/service";
import { DomainError } from "@/db/exec";

export async function rejudgeAction(submissionId: number) {
  const actor = await requireRole("Teacher", "Admin", "TA");
  try {
    await requestRejudge(submissionId, actor.userId);
    await dispatchSubmission(submissionId);
    revalidatePath(`/submissions/${submissionId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : "Có lỗi xảy ra khi yêu cầu chấm lại." };
  }
}
