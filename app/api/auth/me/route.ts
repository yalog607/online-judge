import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import * as authRepo from "@/modules/auth/repo";

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const user = await authRepo.getUserById(session.userId);
  if (!user) {
    return NextResponse.json(
      { error: "Người dùng không tồn tại." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      userId: user.UserID,
      username: user.Username,
      email: user.Email,
      fullName: user.FullName,
      role: user.Role,
      status: user.Status,
      avatar: user.Avatar,
    },
  });
}
