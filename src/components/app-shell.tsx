import Link from "next/link";
import Image from "next/image";
import { logoutAction, endImpersonationAction } from "@/modules/auth/actions";
import { Icon } from "@/components/icon";
import { NavLinks, type NavLink } from "@/components/nav-links";
import { NotificationBell, NotificationProvider } from "@/components/notification-center";
import { verifySession } from "@/lib/dal";
import { unreadCountFor } from "@/modules/notification/service";

export type NavItem = NavLink;

// Same hue rule as the design: a stable colour per person.
const avatarHue = (name: string) => (name.charCodeAt(0) * 47 + name.length * 13) % 360;

export async function AppShell({
  roleLabel,
  fullName,
  avatar,
  nav,
  impersonating,
  notificationsHref,
  children,
}: {
  roleLabel: string;
  fullName: string;
  avatar?: string | null;
  nav: NavItem[];
  impersonating: boolean;
  notificationsHref: string;
  children: React.ReactNode;
}) {
  const initial = fullName.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ?? "?";
  const hue = avatarHue(fullName.trim().split(/\s+/).slice(-2).join(" "));
  const session = await verifySession();
  const initialUnread = session ? await unreadCountFor(session.userId).catch(() => 0) : 0;

  const renderAvatar = (size: 32 | 34) => {
    const box = size === 34 ? "h-[34px] w-[34px]" : "h-8 w-8";
    return avatar ? (
      <Image
        src={avatar}
        alt={fullName}
        width={size}
        height={size}
        unoptimized
        className={`${box} flex-none rounded-full object-cover`}
      />
    ) : (
      <span
        style={{ backgroundColor: `hsl(${hue} 55% 46%)` }}
        className={`grid ${box} flex-none place-items-center rounded-full text-sm font-semibold text-white`}
      >
        {initial}
      </span>
    );
  };

  return (
    <NotificationProvider href={notificationsHref} initialUnread={initialUnread}>
      <div className="flex min-h-screen max-[820px]:flex-col">
        <aside className="sticky top-0 flex h-screen w-60 flex-none flex-col gap-1 border-r border-line p-3 max-[820px]:static max-[820px]:h-auto max-[820px]:w-auto max-[820px]:flex-row max-[820px]:items-center max-[820px]:overflow-x-auto max-[820px]:border-b max-[820px]:border-r-0">
          <Link href="/" className="flex items-center gap-2 px-2 pb-4 max-[820px]:pb-0">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-fg shadow-card">
              IT
            </span>
            <span className="text-lg font-bold tracking-tight">ITOJ</span>
            <span className="ml-auto rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary max-[820px]:ml-2">
              {roleLabel}
            </span>
          </Link>
          <NavLinks items={nav} />
          <div className="mt-auto flex items-center gap-2.5 border-t border-line px-2 pt-3 max-[820px]:hidden">
            {renderAvatar(32)}
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate font-semibold">{fullName}</div>
              <div className="text-xs text-fg-muted">{roleLabel}</div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Đăng xuất"
                title="Đăng xuất"
                className="grid h-8 w-8 place-items-center rounded-lg text-fg-muted hover:bg-muted hover:text-fg"
              >
                <Icon name="logout" size={16} />
              </button>
            </form>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {impersonating && (
            <div className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-500/30 bg-amber-500/15 px-6 py-2 text-xs font-medium text-amber-500 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-500/20 text-xs">
                  👁
                </span>
                <span>
                  Đang mô phỏng người dùng: <strong className="text-fg font-semibold">{fullName}</strong>
                </span>
              </div>
              <form action={endImpersonationAction}>
                <button
                  type="submit"
                  className="rounded-lg border border-amber-500/40 bg-surface px-3 py-1 text-xs font-semibold text-fg hover:bg-muted transition-colors shadow-xs"
                >
                  Thoát mô phỏng
                </button>
              </form>
            </div>
          )}
          <header className="sticky top-0 z-10 flex items-center justify-end gap-4 border-b border-line bg-bg/85 px-8 py-3 backdrop-blur max-[820px]:static max-[820px]:px-4">
            <div className="flex items-center gap-2.5">
              <NotificationBell href={notificationsHref} />
              {renderAvatar(34)}
              <div className="flex flex-col leading-tight max-[820px]:hidden">
                <span className="font-semibold">{fullName}</span>
                <span className="text-xs text-fg-muted">{roleLabel}</span>
              </div>
            </div>
          </header>
          <main className="flex-1 px-8 pb-14 max-[820px]:px-4">{children}</main>
        </div>
      </div>
    </NotificationProvider>
  );
}
