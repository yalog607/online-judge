"use client";

import { useActionState, useState } from "react";
import { registerAction, requestRegisterOtpAction, type FormState } from "@/modules/auth/actions";
import { Field, FormError, SubmitButton } from "@/components/form";
import { digitsOnly, OtpButton, useOtpRequest } from "@/components/otp-request";

const initial: FormState = {};

export function RegisterForm() {
  const [regState, action] = useActionState(registerAction, initial);
  const otp = useOtpRequest(requestRegisterOtpAction);
  const [values, setValues] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });
  const bind = (name: keyof typeof values) => ({
    value: values[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [name]: e.target.value })),
  });

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <Field id="fullName" label="Họ và tên" required autoComplete="name" {...bind("fullName")} />
      <Field
        id="email"
        label="Email"
        type="email"
        required
        autoComplete="email"
        {...bind("email")}
      />
      <Field
        id="password"
        label="Mật khẩu"
        type="password"
        required
        autoComplete="new-password"
        {...bind("password")}
      />
      <Field
        id="confirmPassword"
        label="Xác nhận mật khẩu"
        type="password"
        required
        autoComplete="new-password"
        {...bind("confirmPassword")}
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
          label="Nhận mã OTP"
          pending={otp.pending}
          cooldown={otp.cooldown}
          onClick={() => otp.request(values.email)}
        />
      </div>
      {otp.state.ok && (
        <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">
          Đã gửi mã OTP tới email của bạn (hiệu lực 5 phút).
        </p>
      )}
      <FormError message={otp.state.error ?? regState.error} />
      <SubmitButton className="w-full justify-center">Hoàn tất đăng ký</SubmitButton>
    </form>
  );
}
