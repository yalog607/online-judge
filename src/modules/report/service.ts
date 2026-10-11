import "server-only";
import { DomainError } from "@/db/exec";
import * as repo from "./repo";

export class ReportError extends Error {}

export async function getClassReport(actorId: number, classId: number) {
  try {
    return await repo.getClassStats(actorId, classId);
  } catch (e) {
    if (e instanceof DomainError) throw new ReportError(e.message);
    throw e;
  }
}

export async function getContestReport(actorId: number, contestId: number) {
  try {
    return await repo.getContestStats(actorId, contestId);
  } catch (e) {
    if (e instanceof DomainError) throw new ReportError(e.message);
    throw e;
  }
}

export async function getReportOptions(actorId: number) {
  const [classes, contests] = await Promise.all([
    repo.listClassesForReport(actorId),
    repo.listContestsForReport(actorId),
  ]);
  return { classes, contests };
}

export { generateExcelReport } from "./excel";
export type { ExcelReportParams } from "./excel";
