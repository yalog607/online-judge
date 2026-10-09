"use client";

import { useEffect, useState, useTransition } from "react";

type OtpResult = { error?: string; ok?: boolean };

export const OTP_COOLDOWN_SECONDS = 60;

// Gửi OTP bằng onClick + transition (không qua formAction) để React không reset form
// và để trạng thái "đang gửi" của nút OTP không ảnh hưởng nút submit chính.
export function useOtpRequest(
  action: (prev: OtpResult, formData: FormData) => Promise<OtpResult>,
) {
  const [state, setState] = useState<OtpResult>({});
  const [pending, startTransition] = useTransition();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function request(email: string) {
    const formData = new FormData();
    formData.set("email", email);
    startTransition(async () => {
      const result = await action({}, formData);
      setState(result);
      if (result.ok) setCooldown(OTP_COOLDOWN_SECONDS);
    });
  }

  return { state, pending, cooldown, request, clear: () => setState({}) };
}

export function OtpButton({
  label,
  pending,
  cooldown,
  onClick,
}: {
  label: string;
  pending: boolean;
  cooldown: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || cooldown > 0}
      className="whitespace-nowrap rounded-lg bg-muted px-4 py-2.5 font-medium text-fg disabled:opacity-60"
    >
      {pending ? "Đang gửi…" : cooldown > 0 ? `Gửi lại sau ${cooldown}s` : label}
    </button>
  );
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}
