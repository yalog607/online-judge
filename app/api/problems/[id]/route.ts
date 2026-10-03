import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import * as problemRepo from "@/modules/problem/repo";
import { problemFormSchema } from "@/modules/problem/schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const problemId = parseInt(id, 10);
    if (isNaN(problemId)) {
      return NextResponse.json({ error: "Mã bài tập không hợp lệ." }, { status: 400 });
    }

    const problem = await problemRepo.getProblem(problemId);
    if (!problem) {
      return NextResponse.json({ error: "Bài tập không tồn tại." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: problem,
    });
  } catch {
    return NextResponse.json(
      { error: "Không thể lấy thông tin bài tập." },
      { status: 500 }
    );
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

    const { id } = await params;
    const problemId = parseInt(id, 10);
    if (isNaN(problemId)) {
      return NextResponse.json({ error: "Mã bài tập không hợp lệ." }, { status: 400 });
    }

    const body = await req.json();
    const parsed = problemFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await problemRepo.updateProblem({
      problemId,
      actorId: session.userId,
      ...parsed.data,
    });
    return NextResponse.json({
      success: true,
      message: "Cập nhật bài tập thành công.",
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Cập nhật bài tập thất bại." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const { id } = await params;
    const problemId = parseInt(id, 10);
    if (isNaN(problemId)) {
      return NextResponse.json({ error: "Mã bài tập không hợp lệ." }, { status: 400 });
    }

    await problemRepo.deleteProblem(problemId, session.userId);
    return NextResponse.json({
      success: true,
      message: "Xóa bài tập thành công.",
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Xóa bài tập thất bại." },
      { status: 500 }
    );
  }
}
