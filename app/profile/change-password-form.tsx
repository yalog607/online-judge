"use client";

import { useActionState } from "react";
import { changePasswordAction, type FormState } from "@/modules/auth/actions";
import { FormError, SubmitButton } from "@/components/form";

const initial: FormState = {};

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initial);
  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="oldPassword" className="text-xs font-medium text-fg-muted">
          Mật khẩu cũ
        </label>
        <input
          id="oldPassword"
          name="oldPassword"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-line bg-muted/40 px-3.5 py-2 text-sm text-fg outline-none focus:border-primary focus:bg-surface transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="text-xs font-medium text-fg-muted">
          Mật khẩu mới
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          placeholder="Ít nhất 8 ký tự"
          autoComplete="new-password"
          className="w-full rounded-lg border border-line bg-muted/40 px-3.5 py-2 text-sm text-fg outline-none focus:border-primary focus:bg-surface transition-colors placeholder:text-fg-subtle"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-xs font-medium text-fg-muted">
          Nhập lại mật khẩu mới
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className="w-full rounded-lg border border-line bg-muted/40 px-3.5 py-2 text-sm text-fg outline-none focus:border-primary focus:bg-surface transition-colors"
        />
      </div>

      {state.ok && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-500">
          Đã đổi mật khẩu thành công.
        </div>
      )}
      <FormError message={state.error} />
      <SubmitButton className="self-start rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-fg hover:opacity-90 transition-opacity">
        Lưu thay đổi
      </SubmitButton>
    </form>
  );
}
