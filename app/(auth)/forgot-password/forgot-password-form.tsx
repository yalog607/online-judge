"use client";

import { useActionState } from "react";
import { requestResetOtpAction, resetPasswordAction, type FormState } from "@/modules/auth/actions";
import { Field, FormError, SubmitButton } from "@/components/form";

const initial: FormState = {};

export function ForgotPasswordForm() {
  const [resetState, action] = useActionState(resetPasswordAction, initial);
  const [otpState, otpAction] = useActionState(requestResetOtpAction, initial);

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <Field id="email" label="Email" type="email" required autoComplete="email" />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field id="otp" label="Mã OTP" required inputMode="numeric" maxLength={6} />
        </div>
<<<<<<< HEAD
        <SubmitButton formAction={otpAction} formNoValidate className="whitespace-nowrap bg-muted text-fg">
=======
        <SubmitButton
          formAction={otpAction}
          formNoValidate
          className="whitespace-nowrap bg-muted text-fg"
        >
>>>>>>> main
          Gửi mã
        </SubmitButton>
      </div>
      {otpState.ok && (
        <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">Đã gửi mã xác nhận.</p>
      )}
      <Field
        id="password"
        label="Mật khẩu mới"
        type="password"
        required
        autoComplete="new-password"
      />
      <FormError message={otpState.error ?? resetState.error} />
      <SubmitButton className="w-full justify-center">Đổi mật khẩu</SubmitButton>
    </form>
  );
}
