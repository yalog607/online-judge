"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { updateProfileAction, type FormState } from "@/modules/auth/actions";
import { FormError, SubmitButton } from "@/components/form";

const initial: FormState = {};

export function ProfileForm({
  fullName,
  email,
  username,
  roleLabel,
  avatar,
}: {
  fullName: string;
  email: string;
  username: string;
  roleLabel: string;
  avatar: string | null;
}) {
  const [state, action] = useActionState(updateProfileAction, initial);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatar);
  const [fileName, setFileName] = useState<string | null>(null);

  const initialLetter = fullName.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ?? "A";

  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <div className="flex items-center gap-4 py-2">
        <div className="relative flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-full bg-indigo-600 text-xl font-bold text-white shadow-inner">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Avatar"
              width={64}
              height={64}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{initialLetter}</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setPreviewUrl(URL.createObjectURL(file));
                setFileName(file.name);
              }
            }}
          />
          <label
            htmlFor="avatar"
            className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-line bg-muted/60 px-3.5 py-1.5 text-xs font-medium text-fg hover:bg-muted transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <span>Tải ảnh đại diện</span>
          </label>
          <span className="text-[11px] text-fg-muted">
            {fileName ? `Đã chọn: ${fileName}` : "JPG hoặc PNG, tối đa 2 MB"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullName" className="text-xs font-medium text-fg-muted">
          Họ và tên
        </label>
        <input
          id="fullName"
          name="fullName"
          defaultValue={fullName}
          required
          className="w-full rounded-lg border border-line bg-muted/40 px-3.5 py-2 text-sm text-fg outline-none focus:border-primary focus:bg-surface transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-fg-muted">
          Email
        </label>
        <input
          value={email}
          readOnly
          disabled
          className="w-full rounded-lg border border-line bg-muted/30 px-3.5 py-2 text-sm text-fg-muted cursor-not-allowed select-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-fg-muted">
            Tên đăng nhập
          </label>
          <input
            value={username}
            readOnly
            disabled
            className="w-full rounded-lg border border-line bg-muted/30 px-3.5 py-2 text-sm text-fg-muted cursor-not-allowed select-none"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-fg-muted">
            Vai trò
          </label>
          <input
            value={roleLabel}
            readOnly
            disabled
            className="w-full rounded-lg border border-line bg-muted/30 px-3.5 py-2 text-sm text-fg-muted cursor-not-allowed select-none"
          />
        </div>
      </div>

      {state.ok && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-500">
          Đã lưu thay đổi thông tin cá nhân.
        </div>
      )}
      <FormError message={state.error} />
      <SubmitButton className="self-start rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-fg hover:opacity-90 transition-opacity">
        Lưu thay đổi
      </SubmitButton>
    </form>
  );
}
