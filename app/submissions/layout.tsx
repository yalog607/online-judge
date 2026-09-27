import { requireUser } from "@/lib/dal";

export default async function SubmissionsLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="mx-auto max-w-5xl px-4 pb-16">{children}</div>;
}
