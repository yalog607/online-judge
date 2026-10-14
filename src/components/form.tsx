"use client";

import { useFormStatus } from "react-dom";
import { useEffect, useRef, type ButtonHTMLAttributes, type FormHTMLAttributes } from "react";
import { PasswordInput } from "@/components/password-input";

const BUTTON_VARIANT = {
  primary: "bg-primary text-primary-fg shadow-card hover:opacity-90",
  ghost: "bg-transparent text-fg-muted hover:bg-muted",
};

const FIELD_INPUT =
  "rounded-lg border border-line bg-muted px-3.5 py-2.5 text-base text-fg outline-none focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary-soft w-full";

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
      {type === "password" ? (
        <PasswordInput id={id} name={id} className={FIELD_INPUT} {...rest} />
      ) : (
        <input id={id} name={id} type={type} className={FIELD_INPUT} {...rest} />
      )}
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      tabIndex={-1}
      data-form-error
      className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad outline-none"
    >
      {message}
    </p>
  );
}

type ActionResult = { error?: string; ok?: boolean; field?: string };

/**
 * Form dùng cho Server Action (`useActionState`).
 *
 * React 19 tự gọi `form.reset()` sau mỗi action, kể cả khi action trả lỗi, nên người dùng mất
 * toàn bộ dữ liệu vừa nhập. Component này:
 * - chặn việc reset đó (chỉ reset khi `resetOnSuccess` và action thành công);
 * - khi action trả lỗi, đưa focus về ô bị lỗi (`state.field` hoặc `errorField`), nếu không có thì
 *   về khung thông báo lỗi để người dùng nhìn thấy và tự sửa.
 */
export function Form({
  state,
  resetOnSuccess = false,
  errorField,
  onReset,
  ...rest
}: FormHTMLAttributes<HTMLFormElement> & {
  state?: ActionResult;
  resetOnSuccess?: boolean;
  errorField?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const allowReset = useRef(false);

  useEffect(() => {
    const form = ref.current;
    if (!form || !state) return;
    if (state.ok) {
      if (!resetOnSuccess) return;
      allowReset.current = true;
      form.reset();
      allowReset.current = false;
      return;
    }
    if (!state.error) return;
    const name = state.field ?? errorField;
    const target = name ? form.elements.namedItem(name) : null;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      target.focus();
      try {
        if (!(target instanceof HTMLSelectElement)) target.select();
      } catch {
        // Một số kiểu input (number, email...) không hỗ trợ select().
      }
      return;
    }
    form.querySelector<HTMLElement>("[data-form-error]")?.focus();
  }, [state, resetOnSuccess, errorField]);

  return (
    <form
      ref={ref}
      onReset={(e) => {
        if (!allowReset.current) e.preventDefault();
        onReset?.(e);
      }}
      {...rest}
    />
  );
}
