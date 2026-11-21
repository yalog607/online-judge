"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

export function CopyButton({
  value,
  label = "Sao chép",
  copiedLabel = "Đã chép",
  className = "",
  iconOnly = false,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore clipboard denied */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? copiedLabel : label}
      title={copied ? copiedLabel : label}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium transition-colors ${
        copied
          ? "border-ok/30 bg-ok-soft text-ok"
          : "text-fg-muted hover:bg-muted hover:text-fg"
      } ${className}`}
    >
      <Icon name={copied ? "check" : "copy"} size={13} />
      {!iconOnly && <span>{copied ? copiedLabel : label}</span>}
    </button>
  );
}
