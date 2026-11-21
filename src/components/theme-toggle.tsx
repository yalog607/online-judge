"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/icon";

type Theme = "light" | "dark";

const THEME_EVENT = "itoj:theme-change";

function getActiveTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "dark" || explicit === "light") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribeTheme(onStoreChange: () => void) {
  window.addEventListener(THEME_EVENT, onStoreChange);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onStoreChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onStoreChange);
    mq.removeEventListener("change", onStoreChange);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(
    subscribeTheme,
    getActiveTheme,
    () => "light",
  );

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("itoj-theme", next);
    } catch {
      /* ignore storage errors */
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      title={isDark ? "Giao diện sáng" : "Giao diện tối"}
      className="grid h-[38px] w-[38px] place-items-center rounded-[9px] border border-line bg-surface text-fg-muted hover:bg-muted hover:text-fg"
    >
      <Icon name={isDark ? "sun" : "moon"} size={17} />
    </button>
  );
}
