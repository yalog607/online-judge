import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sessionCookieName } from "@/lib/session";

// Optimistic check only: presence of the cookie, not its validity or role.
// Real authorization happens in the DAL (verifySession/requireRole) on the server.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(sessionCookieName());
  const { pathname } = request.nextUrl;

  const protectedPrefix = ["/user", "/teacher", "/admin", "/profile"].find((p) =>
    pathname.startsWith(p),
  );
  if (protectedPrefix && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if ((pathname === "/login" || pathname === "/register") && hasSession) {
    return NextResponse.redirect(new URL("/user", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/user/:path*",
    "/teacher/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/login",
    "/register",
  ],
};
