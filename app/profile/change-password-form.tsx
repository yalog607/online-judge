"use client";

import { useActionState } from "react";
import { changePasswordAction, type FormState } from "@/modules/auth/actions";
import { Field, FormError, SubmitButton } from "@/components/form";

const initial: FormState = {};

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initial);
  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <Field id="oldPassword" label="Mật khẩu cũ" type="password" required />
      <Field id="newPassword" label="Mật khẩu mới" type="password" required />
      {state.ok && (
        <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">Đã đổi mật khẩu.</p>
      )}
      <FormError message={state.error} />
      <SubmitButton className="self-start">Đổi mật khẩu</SubmitButton>
    </form>
  );
}
