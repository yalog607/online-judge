import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { DomainError } from "@/db/exec";
import * as authRepo from "@/modules/auth/repo";
import { directRegisterSchema } from "@/modules/auth/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = directRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { username, email, password, fullName } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await authRepo.registerDirect({
      username,
      email,
      passwordHash,
      fullName,
    });

    return NextResponse.json(
      {
        success: true,
        data: { userId, username, email, fullName, role: "User" },
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
