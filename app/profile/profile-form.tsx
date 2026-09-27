"use client";

import { useActionState } from "react";
import { updateProfileAction, type FormState } from "@/modules/auth/actions";
import { Field, FormError, SubmitButton } from "@/components/form";

const initial: FormState = {};

export function ProfileForm({ fullName }: { fullName: string }) {
  const [state, action] = useActionState(updateProfileAction, initial);
  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <Field id="fullName" label="Họ và tên" defaultValue={fullName} required />
      <label className="flex flex-col gap-1.5 text-sm font-medium text-fg-muted">
        <span>Ảnh đại diện</span>
        <input id="avatar" name="avatar" type="file" accept="image/*" className="text-sm" />
      </label>
      {state.ok && (
        <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">Đã lưu thay đổi.</p>
      )}
      <FormError message={state.error} />
      <SubmitButton className="self-start">Lưu thay đổi</SubmitButton>
    </form>
  );
}
