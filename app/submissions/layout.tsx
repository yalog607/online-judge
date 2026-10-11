import { requireUser, roleHome } from "@/lib/dal";
import { NotificationProvider } from "@/components/notification-center";

export default async function SubmissionsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <NotificationProvider href={`${roleHome(user.role)}/notifications`}>
      <div className="mx-auto max-w-5xl px-4 pb-16">{children}</div>
    </NotificationProvider>
  );
}
