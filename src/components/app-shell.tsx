import Link from "next/link";
import { logoutAction, endImpersonationAction } from "@/modules/auth/actions";
import { SubmitButton } from "@/components/form";

export type NavItem = { href: string; label: string };

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
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-none flex-col gap-1 p-3">
        <div className="flex items-center gap-2 px-2 pb-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-fg text-sm font-semibold text-bg">
            IT
          </span>
          <span className="text-lg font-bold tracking-tight">ITOJ</span>
          <span className="ml-auto rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
            {roleLabel}
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 font-medium text-fg-muted hover:bg-muted hover:text-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction}>
          <SubmitButton className="w-full justify-start bg-transparent text-fg-muted hover:bg-muted">
            Đăng xuất
          </SubmitButton>
        </form>
      </aside>
      <div className="flex flex-1 flex-col">
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
        <header className="flex items-center justify-end gap-3 px-8 py-3">
          <span className="font-medium">{fullName}</span>
        </header>
        <main className="flex-1 px-8 pb-14">{children}</main>
      </div>
    </div>
  );
}
