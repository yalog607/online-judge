import { requireUser, roleHome } from "@/lib/dal";
import { NotificationCenter } from "@/components/notification-center";

export default async function SubmissionsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      <NotificationCenter href={`${roleHome(user.role)}/notifications`} showBell={false} />
      {children}
    </div>
  );
}
