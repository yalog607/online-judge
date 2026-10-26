import "server-only";
import { execProc } from "@/db/exec";

export type AdminAuditRow = {
  AuditID: number;
  Action: string;
  TargetType: string;
  TargetID: number | null;
  Detail: string | null;
  CreatedAt: Date;
  ActorName: string;
  TargetName: string | null;
};

export async function listAdminAudit(actorId: number, page: number, pageSize: number) {
  const { rows } = await execProc<AdminAuditRow & { TotalCount: number }>("usp_Admin_ListAudit", {
    ActorID: actorId,
    Page: page,
    PageSize: pageSize,
  });
  return { rows, total: rows[0]?.TotalCount ?? 0 };
}
