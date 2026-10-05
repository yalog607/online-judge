import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { contestRepository } from "@/modules/contest/repo";
import { addContestProblemSchema } from "@/modules/contest/schema";

export async function GET(
  _req: NextRequest,
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

    const problems = await contestRepository.listProblems(contestId, session.userId);
    return NextResponse.json({
      success: true,
      data: problems,
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Không thể lấy danh sách bài tập." }, { status: 500 });
  }
}

export async function POST(
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
        { error: "Chỉ giáo viên hoặc quản trị viên mới có thể thêm bài tập." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const contestId = parseInt(id, 10);
    if (isNaN(contestId)) {
      return NextResponse.json({ error: "Mã kỳ thi không hợp lệ." }, { status: 400 });
    }

    const body = await req.json();
    const parsed = addContestProblemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    await contestRepository.addProblem(contestId, session.userId, parsed.data);
    return NextResponse.json({
      success: true,
      message: "Thêm bài tập vào kỳ thi thành công.",
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Thêm bài tập thất bại." }, { status: 500 });
  }
}

export async function DELETE(
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
        { error: "Chỉ giáo viên hoặc quản trị viên mới có thể gỡ bài tập." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const contestId = parseInt(id, 10);
    if (isNaN(contestId)) {
      return NextResponse.json({ error: "Mã kỳ thi không hợp lệ." }, { status: 400 });
    }

    const url = new URL(req.url);
    const problemId = parseInt(url.searchParams.get("problemId") || "", 10);
    if (isNaN(problemId)) {
      return NextResponse.json({ error: "Mã bài tập không hợp lệ." }, { status: 400 });
    }

    await contestRepository.removeProblem(contestId, problemId, session.userId);
    return NextResponse.json({
      success: true,
      message: "Gỡ bài tập khỏi kỳ thi thành công.",
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Gỡ bài tập thất bại." }, { status: 500 });
  }
}
