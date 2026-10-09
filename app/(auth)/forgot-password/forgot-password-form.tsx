"use client";

import { useActionState, useState } from "react";
import { requestResetOtpAction, resetPasswordAction, type FormState } from "@/modules/auth/actions";
import { Field, FormError, SubmitButton } from "@/components/form";
import { digitsOnly, OtpButton, useOtpRequest } from "@/components/otp-request";

const initial: FormState = {};

export function ForgotPasswordForm() {
  const [resetState, action] = useActionState(resetPasswordAction, initial);
  const otp = useOtpRequest(requestResetOtpAction);
  const [values, setValues] = useState({ email: "", otp: "", password: "" });

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <Field
        id="email"
        label="Email"
        type="email"
        required
        autoComplete="email"
        value={values.email}
        onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
      />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field
            id="otp"
            label="Mã OTP"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={values.otp}
            onChange={(e) => setValues((v) => ({ ...v, otp: digitsOnly(e.target.value) }))}
          />
        </div>
        <OtpButton
          label="Gửi mã"
          pending={otp.pending}
          cooldown={otp.cooldown}
          onClick={() => otp.request(values.email)}
        />
      </div>
      {otp.state.ok && (
        <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">
          Đã gửi mã xác nhận (hiệu lực 5 phút).
        </p>
      )}
      <Field
        id="password"
        label="Mật khẩu mới"
        type="password"
        required
        autoComplete="new-password"
        value={values.password}
        onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
      />
      <FormError message={otp.state.error ?? resetState.error} />
      <SubmitButton className="w-full justify-center">Đổi mật khẩu</SubmitButton>
    </form>
  );
}
