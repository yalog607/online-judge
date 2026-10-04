import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { classRepository } from "@/modules/class/repo";
import { joinClassSchema } from "@/modules/class/schema";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = joinClassSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const classId = await classRepository.joinByInviteCode(
      session.userId,
      parsed.data.inviteCode
    );

    return NextResponse.json({
      success: true,
      message: "Tham gia lớp học thành công.",
      data: { classId },
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Tham gia lớp học thất bại." },
      { status: 500 }
    );
  }
}
