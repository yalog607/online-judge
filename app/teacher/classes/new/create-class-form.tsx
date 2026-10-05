"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createClassAction, type FormState } from "@/modules/class/actions";
import { Field, FormError, SubmitButton } from "@/components/form";

const initial: FormState = {};

export function CreateClassForm() {
  const [state, action] = useActionState(createClassAction, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field
        id="className"
        label="Tên lớp học"
        placeholder="Ví dụ: Cấu trúc dữ liệu & Giải thuật - Lớp 01"
        required
      />

      <label htmlFor="description" className="flex flex-col gap-1.5 text-sm font-medium text-fg-muted">
        <span>Mô tả lớp học</span>
        <textarea
          id="description"
          name="description"
          rows={4}
          placeholder="Mô tả nội dung, mục tiêu của lớp học..."
          className="rounded-lg border border-line bg-muted px-3.5 py-2.5 text-base text-fg outline-none focus:border-primary focus:bg-surface"
        />
      </label>

      <Field
        id="inviteCode"
        label="Mã mời tùy chỉnh (Để trống để tự động sinh)"
        placeholder="Ví dụ: CTDL2026"
        maxLength={20}
      />

      <label className="flex items-center gap-2 cursor-pointer pt-2">
        <input
          type="checkbox"
          name="isPublic"
          id="isPublic"
          defaultChecked
          className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
        />
        <span className="text-sm font-medium text-fg">Cho phép hiển thị công khai trong danh sách lớp</span>
      </label>

      <FormError message={state.error} />

      <div className="flex items-center justify-end gap-3 pt-4">
        <Link
          href="/teacher/classes"
          className="rounded-lg border border-line px-4 py-2.5 font-medium text-fg-muted hover:bg-muted"
        >
          Hủy bỏ
        </Link>
        <SubmitButton>Tạo lớp học</SubmitButton>
      </div>
    </form>
  );
}
