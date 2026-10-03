import { NextResponse } from "next/server";
import { readSession, destroySession } from "@/lib/session";
import * as authRepo from "@/modules/auth/repo";

export async function POST() {
  const session = await readSession();
  if (session?.sessionId) {
    await authRepo.revokeDbSession(session.sessionId);
  }
  await destroySession();

  return NextResponse.json({
    success: true,
    message: "Đăng xuất thành công.",
  });
}
