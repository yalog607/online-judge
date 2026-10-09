import Link from "next/link";
import { logoutAction, endImpersonationAction } from "@/modules/auth/actions";
import { Icon } from "@/components/icon";
import { NavLinks, type NavLink } from "@/components/nav-links";

export type NavItem = NavLink;

export function AppShell({
  roleLabel,
  fullName,
  nav,
  impersonating,
  children,
}: {
  roleLabel: string;
  fullName: string;
  nav: NavItem[];
  impersonating: boolean;
  children: React.ReactNode;
}) {
  const initial = fullName.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ?? "?";
  return (
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
          <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
            {initial}
          </span>
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
          <div className="flex items-center gap-3 bg-warn-soft px-6 py-2 text-warn">
            <span>Đang mô phỏng người dùng: {fullName}</span>
            <form action={endImpersonationAction}>
              <button type="submit" className="font-medium underline">
                Kết thúc mô phỏng
              </button>
            </form>
          </div>
        )}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-bg/85 px-8 py-3 backdrop-blur max-[820px]:static max-[820px]:px-4">
          <form action="/user/problems" method="get" role="search" className="w-full max-w-[420px]">
            <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 text-fg-muted focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary-soft">
              <Icon name="search" size={16} />
              <input
                name="q"
                aria-label="Tìm bài tập"
                placeholder="Tìm bài tập..."
                className="w-full bg-transparent py-2 text-fg outline-none"
              />
            </label>
          </form>
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
              {initial}
            </span>
            <span className="font-medium max-[820px]:hidden">{fullName}</span>
          </div>
        </header>
        <main className="flex-1 px-8 pb-14 max-[820px]:px-4">{children}</main>
      </div>
    </div>
  );
}
