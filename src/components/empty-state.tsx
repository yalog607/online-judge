export function EmptyState({
  children,
  variant = "card",
  colSpan,
}: {
  children: React.ReactNode;
  variant?: "card" | "cell";
  colSpan?: number;
}) {
  if (variant === "cell") {
    return (
      <tr>
        <td colSpan={colSpan} className="px-5 py-12 text-center text-sm text-fg-muted">
          {children}
        </td>
      </tr>
    );
  }
  return <div className="card p-8 text-center text-sm text-fg-muted">{children}</div>;
}
