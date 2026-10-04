"use client";

import { useActionState } from "react";
import { joinClassAction, type FormState } from "@/modules/class/actions";
import { FormError, SubmitButton } from "@/components/form";

const initial: FormState = {};

export function JoinClassForm() {
  const [state, action] = useActionState(joinClassAction, initial);

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        type="text"
        name="inviteCode"
        id="inviteCode"
        placeholder="Nhập mã mời lớp học (VD: CTDL2026)..."
        required
        maxLength={20}
        className="flex-1 rounded-lg border border-line bg-muted px-4 py-2.5 text-fg outline-none focus:border-primary focus:bg-surface font-mono"
      />
      <SubmitButton className="whitespace-nowrap">Tham gia lớp</SubmitButton>
      <div className="w-full sm:w-auto">
        <FormError message={state.error} />
      </div>
    </form>
  );
}
