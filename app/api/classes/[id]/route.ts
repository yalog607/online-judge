import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { classRepository } from "@/modules/class/repo";
import { updateClassSchema } from "@/modules/class/schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const classId = parseInt(id, 10);
    if (isNaN(classId)) {
      return NextResponse.json({ error: "Mã lớp học không hợp lệ." }, { status: 400 });
    }

    const session = await verifySession();
    const classDetail = await classRepository.getClassDetail(classId, session?.userId);
    if (!classDetail) {
      return NextResponse.json({ error: "Lớp học không tồn tại." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: classDetail,
    });
  } catch {
    return NextResponse.json(
      { error: "Không thể lấy thông tin lớp học." },
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

    if (session.role !== "Teacher" && session.role !== "Admin") {
      return NextResponse.json(
        { error: "Chỉ giáo viên hoặc quản trị viên mới có thể cập nhật lớp học." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const classId = parseInt(id, 10);
    if (isNaN(classId)) {
      return NextResponse.json({ error: "Mã lớp học không hợp lệ." }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateClassSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updated = await classRepository.updateClass(
      session.userId,
      classId,
      parsed.data
    );

    return NextResponse.json({
      success: true,
      message: "Cập nhật thông tin lớp học thành công.",
      data: updated,
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Cập nhật lớp học thất bại." },
      { status: 500 }
    );
  }
}
