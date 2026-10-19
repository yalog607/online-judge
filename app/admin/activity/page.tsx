import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { listAdminAudit } from "@/modules/dashboard/service";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Pager } from "@/components/pager";
import { pageHrefBuilder, parsePage } from "@/lib/paginate";
import { auditLabel } from "../audit-labels";

export const metadata = { title: "Hoạt động hệ thống - ITOJ Admin" };

const PAGE_SIZE = 30;

function formatDateTime(d: Date) {
  return new Date(d).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireRole("Admin");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const { rows, total } = await listAdminAudit(actor.userId, page, PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5 pt-8">
      <Link href="/admin" className="text-sm font-medium text-fg-muted hover:text-fg hover:underline">
        ← Quay lại tổng quan
      </Link>
      <PageHeader title="Hoạt động hệ thống" description="Toàn bộ nhật ký hoạt động quản trị, mới nhất trước." />

      <DataTable columns={[{ label: "Sự kiện" }, { label: "Người thực hiện" }, { label: "Thời gian" }]}>
        {rows.length === 0 ? (
          <EmptyState variant="cell" colSpan={3}>
            Chưa có hoạt động nào.
          </EmptyState>
        ) : (
          rows.map((a) => {
            const target = a.TargetName ?? (a.TargetID ? `#${a.TargetID}` : "");
            return (
              <tr key={a.AuditID} className="hover:bg-muted/40 transition-colors">
                <td className="px-5 py-3.5">
                  {auditLabel(a.Action, a.TargetType)}
                  {target ? <span className="text-fg-muted"> · {target}</span> : null}
                  {a.Detail ? <div className="text-xs text-fg-muted">{a.Detail}</div> : null}
                </td>
                <td className="px-5 py-3.5">{a.ActorName}</td>
                <td className="whitespace-nowrap px-5 py-3.5 text-fg-muted">{formatDateTime(a.CreatedAt)}</td>
              </tr>
            );
          })
        )}
      </DataTable>

      <Pager page={page} pageSize={PAGE_SIZE} total={total} buildHref={pageHrefBuilder(sp, "page")} />
    </div>
  );
}
