"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createClassAction, type FormState } from "@/modules/class/actions";
import { Field, Form, FormError, SubmitButton } from "@/components/form";

const initial: FormState = {};

export function CreateClassForm() {
  const [state, action] = useActionState(createClassAction, initial);
  const [isPublic, setIsPublic] = useState(true);

  return (
    <Form action={action} state={state} errorField="inviteCode" className="flex flex-col gap-5">
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
        label="Mã mời tùy chỉnh (để trống để tự động sinh)"
        placeholder="Ví dụ: CTDL2026"
        maxLength={20}
      />

      <div className="flex flex-col gap-2 pt-1">
        <span className="text-sm font-medium text-fg-muted">Loại lớp học</span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer flex-col rounded-xl border p-3.5 transition-colors ${
              isPublic
                ? "border-primary bg-primary/5"
                : "border-line bg-surface hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="isPublic"
                value="true"
                checked={isPublic}
                onChange={() => setIsPublic(true)}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm font-semibold text-fg">Lớp công khai</span>
            </div>
            <span className="mt-1 pl-6 text-xs text-fg-muted">
              Ai cũng có thể tìm kiếm và tham gia trực tiếp vào lớp học.
            </span>
          </label>

          <label
            className={`flex cursor-pointer flex-col rounded-xl border p-3.5 transition-colors ${
              !isPublic
                ? "border-primary bg-primary/5"
                : "border-line bg-surface hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="isPublic"
                value="false"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm font-semibold text-fg">Lớp cần duyệt</span>
            </div>
            <span className="mt-1 pl-6 text-xs text-fg-muted">
              Học viên điền thông tin gửi yêu cầu, giảng viên xem xét và duyệt trước khi vào lớp.
            </span>
          </label>
        </div>
      </div>

      <FormError message={state.error} />

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
        <Link
          href="/teacher/classes"
          className="rounded-lg border border-line px-4 py-2.5 font-medium text-fg-muted hover:bg-muted"
        >
          Hủy bỏ
        </Link>
        <SubmitButton>Tạo lớp học</SubmitButton>
      </div>
    </Form>
  );
}
