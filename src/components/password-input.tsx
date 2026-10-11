"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Icon } from "@/components/icon";

export function PasswordInput({
  className = "",
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...rest} type={visible ? "text" : "password"} className={`${className} pr-10`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        aria-pressed={visible}
        title={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-fg-muted hover:text-fg"
      >
        <Icon name={visible ? "eye-off" : "eye"} size={16} />
      </button>
    </div>
  );
}
