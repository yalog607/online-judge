import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isImpersonatingToken, sessionCookieName } from "@/lib/session";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Optimistic check only: presence of the cookie, not its validity or role.
// Real authorization happens in the DAL (verifySession/requireRole) on the server.
// /login and /register are NOT redirected here: a stale cookie (session expired or revoked in DB)
// would bounce the user away and make it impossible to sign in again.
export async function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(sessionCookieName());
  const { pathname } = request.nextUrl;

  // Chế độ mô phỏng chỉ để xem: chặn mọi API ghi dữ liệu (trừ /api/auth để thoát/đăng xuất).
  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/") &&
    !SAFE_METHODS.has(request.method) &&
    (await isImpersonatingToken(request.cookies.get(sessionCookieName())?.value))
  ) {
    return NextResponse.json(
      { error: "Đang ở chế độ mô phỏng, chỉ được xem, không thể thay đổi dữ liệu." },
      { status: 403 },
    );
  }

  const protectedPrefix = ["/user", "/teacher", "/admin", "/profile", "/submissions"].find((p) =>
    pathname.startsWith(p),
  );
  if (protectedPrefix && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/user/:path*",
    "/teacher/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/submissions/:path*",
    "/api/:path*",
  ],
};
