"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icon";

export type NavLink = { href: string; label: string; icon: IconName };

const ROOTS = ["/user", "/teacher", "/admin"];

// Mục gốc của từng vai trò (vd /user) chỉ sáng khi đúng trang đó, các mục khác sáng cả trang con.
function isActive(pathname: string, href: string) {
  if (ROOTS.includes(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ items }: { items: NavLink[] }) {
  const pathname = usePathname();
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
          </Link>
        );
      })}
    </nav>
  );
}
