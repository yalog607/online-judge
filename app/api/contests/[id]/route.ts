import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { contestRepository } from "@/modules/contest/repo";
import { updateContestSchema } from "@/modules/contest/schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contestId = parseInt(id, 10);
    if (isNaN(contestId)) {
      return NextResponse.json({ error: "Mã kỳ thi không hợp lệ." }, { status: 400 });
    }

    const session = await verifySession();
    const contest = await contestRepository.getContest(contestId, session?.userId);
    if (!contest) {
      return NextResponse.json({ error: "Kỳ thi không tồn tại." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: contest,
    });
  } catch {
    return NextResponse.json({ error: "Không thể lấy thông tin kỳ thi." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    if (session.role !== "Teacher" && session.role !== "Admin") {
      return NextResponse.json(
        { error: "Chỉ giáo viên hoặc quản trị viên mới có thể cập nhật kỳ thi." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const contestId = parseInt(id, 10);
    if (isNaN(contestId)) {
      return NextResponse.json({ error: "Mã kỳ thi không hợp lệ." }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateContestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    await contestRepository.updateContest(contestId, session.userId, parsed.data);
    return NextResponse.json({
      success: true,
      message: "Cập nhật kỳ thi thành công.",
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Cập nhật kỳ thi thất bại." }, { status: 500 });
  }
}
