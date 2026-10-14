import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { cloneProblem } from "@/modules/problem/repo";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession();
    if (!session || (session.role !== "Teacher" && session.role !== "Admin")) {
      return NextResponse.json(
        { error: "Chỉ giảng viên hoặc quản trị viên mới có quyền nhân bản bài tập." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const problemId = parseInt(id, 10);
    if (isNaN(problemId)) {
      return NextResponse.json({ error: "Mã bài tập không hợp lệ." }, { status: 400 });
    }

    let newTitle: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.newTitle === "string") {
        newTitle = body.newTitle;
      }
    } catch {
      newTitle = undefined;
    }

    const cloned = await cloneProblem(problemId, session.userId, newTitle);

    return NextResponse.json({
      success: true,
      data: cloned,
    });
  } catch (err: unknown) {
    if (err instanceof DomainError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Không thể nhân bản bài tập.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
