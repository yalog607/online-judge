export type Column = { label: string; align?: "left" | "right" | "center" };

/** Khung bảng dùng chung: card + cuộn ngang + header chuẩn. `children` là các <tr> trong <tbody>. */
export function DataTable({
  columns,
  children,
  minWidth,
  footer,
}: {
  columns: Column[];
  children: React.ReactNode;
  minWidth?: number;
  footer?: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={minWidth ? { minWidth } : undefined}>
          <thead>
            <tr className="border-b border-line bg-muted font-medium text-fg-muted">
              {columns.map((c) => (
                <th
                  key={c.label}
                  className={`px-5 py-3 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">{children}</tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
