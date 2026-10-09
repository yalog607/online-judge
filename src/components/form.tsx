"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes } from "react";

const BUTTON_VARIANT = {
  primary: "bg-primary text-primary-fg shadow-card hover:opacity-90",
  ghost: "bg-transparent text-fg-muted hover:bg-muted",
};

export function SubmitButton({
  children,
  className = "",
  variant = "primary",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_VARIANT }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg px-4 py-2.5 font-medium transition-opacity disabled:opacity-60 ${BUTTON_VARIANT[variant]} ${className}`}
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
        className="rounded-lg border border-line bg-muted px-3.5 py-2.5 text-base text-fg outline-none focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary-soft"
        {...rest}
      />
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{message}</p>;
}
