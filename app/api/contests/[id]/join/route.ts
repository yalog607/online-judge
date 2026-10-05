import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { contestRepository } from "@/modules/contest/repo";
import { joinContestSchema } from "@/modules/contest/schema";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const { id } = await params;
    const contestId = parseInt(id, 10);
    if (isNaN(contestId)) {
      return NextResponse.json({ error: "Mã kỳ thi không hợp lệ." }, { status: 400 });
    }

    let password: string | null = null;
    try {
      const body = await req.json();
      const parsed = joinContestSchema.safeParse(body);
      if (parsed.success && parsed.data.password) {
        password = parsed.data.password;
      }
    } catch {
      password = null;
    }

    await contestRepository.joinContest(contestId, session.userId, password);
    return NextResponse.json({
      success: true,
      message: "Tham gia kỳ thi thành công.",
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Tham gia kỳ thi thất bại." }, { status: 500 });
  }
}
