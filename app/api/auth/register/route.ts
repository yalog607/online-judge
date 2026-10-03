import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { DomainError } from "@/db/exec";
import * as authRepo from "@/modules/auth/repo";

const registerSchema = z.object({
  username: z.string().trim().min(3).max(50),
  email: z.string().trim().email(),
  password: z.string().min(6),
  fullName: z.string().trim().min(2).max(100),
  role: z.enum(["User", "Teacher", "Admin"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { username, email, password, fullName, role } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await authRepo.registerDirect({
      username,
      email,
      passwordHash,
      fullName,
      role,
    });

    return NextResponse.json(
      {
        success: true,
        data: { userId, username, email, fullName, role: role ?? "User" },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Đăng ký tài khoản thất bại." },
      { status: 500 }
    );
  }
}
