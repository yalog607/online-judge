"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icon";
import { useUnreadCount } from "@/components/notification-center";

// `unreadBadge`: show the live unread notification count on this item.
export type NavLink = { href: string; label: string; icon: IconName; unreadBadge?: boolean };

const ROOTS = ["/user", "/teacher", "/admin"];

// Mục gốc của từng vai trò (vd /user) chỉ sáng khi đúng trang đó, các mục khác sáng cả trang con.
function isActive(pathname: string, href: string) {
  if (ROOTS.includes(href)) return pathname === href;
  if (pathname.startsWith("/user/problems") && (href === "/teacher/problems" || href === "/admin/problems")) {
    return true;
  }
  if (pathname.startsWith("/user/contests") && (href === "/teacher/contests" || href === "/admin/contests")) {
    return true;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ items }: { items: NavLink[] }) {
  const pathname = usePathname();
  const unread = useUnreadCount();
  return (
    <nav className="flex flex-1 flex-col gap-0.5 max-[820px]:flex-none max-[820px]:flex-row">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 font-medium transition-colors ${
              active
                ? "bg-primary-soft font-semibold text-primary"
                : "text-fg-muted hover:bg-muted hover:text-fg"
            }`}
          >
            <Icon name={item.icon} />
            {item.label}
            {item.unreadBadge && unread > 0 && (
              <span className="ml-auto rounded-full bg-primary px-[7px] text-xs font-semibold leading-[18px] text-primary-fg">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
