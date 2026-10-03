import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import * as authRepo from "@/modules/auth/repo";
import { createSession, SESSION_TTL_MS } from "@/lib/session";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const user = await authRepo.getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không chính xác." },
        { status: 401 }
      );
    }

    if (user.Status === "Locked") {
      return NextResponse.json(
        { error: "Tài khoản của bạn đã bị khóa." },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không chính xác." },
        { status: 401 }
      );
    }

    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const sessionId = await authRepo.createDbSession(user.UserID, expiresAt);
    await createSession(sessionId);

    return NextResponse.json({
      success: true,
      data: {
        userId: user.UserID,
        username: user.Username,
        email: user.Email,
        fullName: user.FullName,
        role: user.Role,
        avatar: user.Avatar,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Đăng nhập thất bại." },
      { status: 500 }
    );
  }
}
