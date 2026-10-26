import { PageHeader } from "@/components/page-header";

export function Welcome({ fullName, roleLabel }: { fullName: string; roleLabel: string }) {
  return (
    <div className="flex flex-col gap-5 pt-8">
      <PageHeader
        title="Chào mừng đến với ITOJ"
        description={`Xin chào ${fullName} (${roleLabel}). Chọn một mục ở thanh bên để bắt đầu.`}
      />
    </div>
  );
}
