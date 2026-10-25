import Link from "next/link";
import { Badge, ClassActiveBadge, ClassApprovalBadge } from "@/components/badge";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import type { ClassItem } from "@/modules/class/repo";

export function ClassListTable({
  classes,
  hrefPrefix,
  relationLabel,
  empty,
  showApprovalStatus = false,
}: {
  classes: ClassItem[];
  hrefPrefix: string;
  relationLabel: (item: ClassItem) => string;
  empty: string;
  showApprovalStatus?: boolean;
}) {
  return (
    <DataTable
      minWidth={860}
      columns={[
        { label: "Mã" },
        { label: "Tên lớp" },
        { label: "Giảng viên" },
        { label: "Vai trò / Phạm vi" },
        { label: "Học viên", align: "center" },
        { label: "Trạng thái" },
        { label: "Thao tác", align: "right" },
      ]}
    >
      {classes.length === 0 ? (
        <EmptyState variant="cell" colSpan={7}>{empty}</EmptyState>
      ) : (
        classes.map((item) => (
          <tr key={item.ClassID} className="transition-colors hover:bg-muted/40">
            <td className="whitespace-nowrap px-5 py-3 text-fg-muted">{item.ClassCode}</td>
            <td className="px-5 py-3">
              <Link href={`${hrefPrefix}/${item.ClassID}`} className="font-semibold text-fg hover:underline">
                {item.ClassName}
              </Link>
              {item.Description && <p className="mt-0.5 line-clamp-1 text-xs text-fg-muted">{item.Description}</p>}
            </td>
            <td className="px-5 py-3 text-xs text-fg-muted">
              <div className="font-medium text-fg">{item.TeacherName}</div>
              <div>{item.TeacherEmail}</div>
            </td>
            <td className="px-5 py-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge kind="info">{relationLabel(item)}</Badge>
                <Badge kind={item.IsPublic ? "ok" : "warn"}>{item.IsPublic ? "Công khai" : "Cần duyệt"}</Badge>
                {showApprovalStatus && <ClassApprovalBadge status={item.ApprovalStatus} />}
              </div>
            </td>
            <td className="px-5 py-3 text-center text-sm text-fg-muted">{item.StudentCount}</td>
            <td className="px-5 py-3"><ClassActiveBadge cancelled={item.IsCancelled} /></td>
            <td className="px-5 py-3 text-right">
              <Link
                href={`${hrefPrefix}/${item.ClassID}`}
                className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-fg transition-colors hover:bg-muted"
              >
                Xem chi tiết
              </Link>
            </td>
          </tr>
        ))
      )}
    </DataTable>
  );
}
