import "server-only";
import * as repo from "./repo";

export async function listAdminAudit(actorId: number, page: number, pageSize: number) {
  return repo.listAdminAudit(actorId, page, pageSize);
}
