"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icon";

type Option = { value: string; label: string; disabled: boolean };

function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : ""))
    .join("");
}

function collectOptions(children: ReactNode, out: Option[] = []): Option[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as {
      value?: string | number;
      children?: ReactNode;
      disabled?: boolean;
    };
    if (child.type === Fragment) {
      collectOptions(props.children, out);
    } else if (child.type === "option") {
      const label = textOf(props.children);
      out.push({ value: String(props.value ?? label), label, disabled: Boolean(props.disabled) });
    }
  });
  return out;
}

type Placement = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

/**
 * Thay thế <select> gốc: cùng API (children là <option>, name, value/defaultValue, onChange,
 * required, disabled, className) nhưng danh sách thả xuống được vẽ theo giao diện ITOJ.
 * Một <select> ẩn vẫn được giữ để form submit và validate như cũ.
 */
export function Select({
  children,
  className = "",
  label,
  value,
  defaultValue,
  disabled,
  onChange,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "multiple" | "size"> & {
  /** Nhãn hiển thị mờ trước giá trị đang chọn, ví dụ "Độ khó". */
  label?: string;
}) {
  const options = collectOptions(children);
  const listId = useId();
  const selectRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const initial =
    value !== undefined
      ? String(value)
      : defaultValue !== undefined
        ? String(defaultValue)
        : (options.find((o) => !o.disabled)?.value ?? "");
  const [current, setCurrent] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState<Placement | null>(null);

  // <select> ẩn là nguồn sự thật (React giữ nó đồng bộ với value/defaultValue).
  // Cố ý chạy sau mỗi lần render để bắt cả thay đổi value do component cha điều khiển.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const v = selectRef.current?.value;
    if (v !== undefined && v !== current) setCurrent(v);
  });

  const close = useCallback(() => setOpen(false), []);

  const openPanel = () => {
    if (disabled) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const wantUp = below < 220 && above > below;
    const maxHeight = Math.max(120, Math.min(280, wantUp ? above : below));
    setPlacement({
      left: rect.left,
      width: Math.max(rect.width, 160),
      maxHeight,
      ...(wantUp ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
    });
    const idx = options.findIndex((o) => o.value === current);
    setActive(idx >= 0 ? idx : Math.max(0, options.findIndex((o) => !o.disabled)));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close();
    };
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    panelRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const choose = (opt: Option) => {
    if (opt.disabled) return;
    const sel = selectRef.current;
    if (sel && sel.value !== opt.value) {
      sel.value = opt.value;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setCurrent(opt.value);
    close();
    triggerRef.current?.focus();
  };

  const move = (dir: 1 | -1) => {
    if (options.length === 0) return;
    let i = active;
    for (let n = 0; n < options.length; n++) {
      i = (i + dir + options.length) % options.length;
      if (!options[i].disabled) break;
    }
    setActive(i);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openPanel();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        setActive(Math.max(0, options.findIndex((o) => !o.disabled)));
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (options[active]) choose(options[active]);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close();
        break;
    }
  };

  const selected = options.find((o) => o.value === current);

  return (
    <>
      <select
        {...rest}
        ref={selectRef}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        onChange={onChange}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px opacity-0"
      >
        {children}
      </select>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={rest["aria-label"]}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={onKeyDown}
        className={`inline-flex items-center justify-between gap-2 text-left text-fg outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary-soft ${className}`}
      >
        <span className="min-w-0 flex-1 truncate">
          {label && <span className="text-fg-muted">{label}: </span>}
          {selected?.label ?? " "}
        </span>
        <Icon
          name="chevron-down"
          size={16}
          className={`flex-none text-fg-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open &&
        placement &&
        createPortal(
          <div
            ref={panelRef}
            id={listId}
            role="listbox"
            style={{
              position: "fixed",
              left: placement.left,
              width: placement.width,
              top: placement.top,
              bottom: placement.bottom,
              maxHeight: placement.maxHeight,
            }}
            className="popover z-[9999] overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-pop"
          >
            {options.map((opt, i) => {
              const isSelected = opt.value === current;
              return (
                <div
                  key={`${opt.value}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled || undefined}
                  data-index={i}
                  onMouseEnter={() => !opt.disabled && setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(opt)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    opt.disabled
                      ? "cursor-not-allowed text-fg-muted/50"
                      : isSelected
                        ? "bg-primary-soft font-medium text-primary"
                        : i === active
                          ? "bg-muted text-fg"
                          : "text-fg"
                  }`}
                >
                  <span className="min-w-0 break-words">{opt.label}</span>
                  {isSelected && <Icon name="check" size={15} className="flex-none" />}
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
