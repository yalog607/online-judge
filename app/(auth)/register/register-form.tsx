"use client";

import { useActionState } from "react";
import { registerAction, requestRegisterOtpAction, type FormState } from "@/modules/auth/actions";
import { Field, FormError, SubmitButton } from "@/components/form";

const initial: FormState = {};

export function RegisterForm() {
  const [regState, action] = useActionState(registerAction, initial);
  const [otpState, otpAction] = useActionState(requestRegisterOtpAction, initial);

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <Field id="fullName" label="Họ và tên" required autoComplete="name" />
      <Field id="email" label="Email" type="email" required autoComplete="email" />
      <Field id="password" label="Mật khẩu" type="password" required autoComplete="new-password" />
      <Field
        id="confirmPassword"
        label="Xác nhận mật khẩu"
        type="password"
        required
        autoComplete="new-password"
      />
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
          Nhận mã OTP
        </SubmitButton>
      </div>
      {otpState.ok && (
        <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">
          Đã gửi mã OTP tới email của bạn (hiệu lực 5 phút).
        </p>
      )}
      <FormError message={otpState.error ?? regState.error} />
      <SubmitButton className="w-full justify-center">Hoàn tất đăng ký</SubmitButton>
    </form>
  );
}
