"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes } from "react";

export function SubmitButton({
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg bg-fg px-4 py-2.5 font-medium text-bg disabled:opacity-60 ${className}`}
      {...rest}
    >
      {pending ? "Đang xử lý…" : children}
    </button>
  );
}

export function Field({
  id,
  label,
  type = "text",
  ...rest
}: {
  id: string;
  label: string;
  type?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-sm font-medium text-fg-muted">
      <span>{label}</span>
      <input
        id={id}
        name={id}
        type={type}
        className="rounded-lg border border-line bg-muted px-3.5 py-2.5 text-base text-fg outline-none focus:border-primary focus:bg-surface"
        {...rest}
      />
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{message}</p>;
}
