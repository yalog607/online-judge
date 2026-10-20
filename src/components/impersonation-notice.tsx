"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const PARAM = "mo_phong_chi_xem";
const SHOW_MS = 5000;

// Hiện thông báo khi một thao tác ghi bị chặn trong chế độ mô phỏng (server quay lại trang kèm cờ).
export function ImpersonationNotice() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const flagged = params.get(PARAM) === "1";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!flagged) return;
    const next = new URLSearchParams(params.toString());
    next.delete(PARAM);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    const show = setTimeout(() => setVisible(true), 0);
    const hide = setTimeout(() => setVisible(false), SHOW_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [flagged, params, pathname, router]);

  if (!visible) return null;
  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-[60] w-[26rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-amber-500/40 bg-surface p-3 text-sm shadow-card"
    >
      <strong className="font-semibold">Đang ở chế độ mô phỏng.</strong> Bạn chỉ có thể xem, không thể thay đổi
      dữ liệu của người dùng này.
    </div>
  );
}
