"use client";

import { useActionState } from "react";
import { addStudentAction, type FormState } from "@/modules/class/actions";
import { FormError, SubmitButton } from "@/components/form";

const initial: FormState = {};

export function AddStudentForm({ classId }: { classId: number }) {
  const addActionWithId = addStudentAction.bind(null, classId);
  const [state, action] = useActionState(addActionWithId, initial);

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        type="text"
        name="identifier"
        id="identifier"
        placeholder="Nhập email hoặc tên đăng nhập của học sinh..."
        required
        className="flex-1 rounded-lg border border-line bg-muted px-4 py-2.5 text-sm text-fg outline-none focus:border-primary focus:bg-surface"
      />
      <SubmitButton className="whitespace-nowrap text-sm py-2">
        + Thêm học sinh
      </SubmitButton>
      {state.error && <FormError message={state.error} />}
      {state.ok && (
        <span className="text-sm font-medium text-ok">
          {state.message}
        </span>
      )}
    </form>
  );
}
