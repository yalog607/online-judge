"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type FormState } from "@/modules/auth/actions";
import { Field, FormError, SubmitButton } from "@/components/form";

const initial: FormState = {};

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initial);
  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <Field id="email" label="Email" type="email" required autoComplete="email" />
      <Field
        id="password"
        label="Mật khẩu"
        type="password"
        required
        autoComplete="current-password"
      />
      <div className="text-right text-sm">
        <Link href="/forgot-password" className="text-fg-muted underline">
          Quên mật khẩu?
        </Link>
      </div>
      <FormError message={state.error} />
      <SubmitButton className="w-full justify-center">Đăng nhập</SubmitButton>
    </form>
  );
}
