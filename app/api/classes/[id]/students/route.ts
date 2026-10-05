import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { classRepository } from "@/modules/class/repo";

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
    const classId = parseInt(id, 10);
    if (isNaN(classId)) {
      return NextResponse.json({ error: "Mã lớp học không hợp lệ." }, { status: 400 });
    }

    const students = await classRepository.getClassStudents(classId, session.userId);
    return NextResponse.json({
      success: true,
      data: students,
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Không thể lấy danh sách học sinh." },
      { status: 500 }
    );
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

    const { id } = await params;
    const classId = parseInt(id, 10);
    if (isNaN(classId)) {
      return NextResponse.json({ error: "Mã lớp học không hợp lệ." }, { status: 400 });
    }

    const body = await req.json();
    const identifier = String(body.identifier || "").trim();
    if (!identifier) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp email hoặc username của học sinh." },
        { status: 400 }
      );
    }

    const studentId = await classRepository.addStudent(classId, session.userId, identifier);
    return NextResponse.json(
      {
        success: true,
        message: "Thêm học sinh thành công.",
        data: { studentId },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Thêm học sinh thất bại." }, { status: 500 });
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

    const { id } = await params;
    const classId = parseInt(id, 10);
    if (isNaN(classId)) {
      return NextResponse.json({ error: "Mã lớp học không hợp lệ." }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = parseInt(searchParams.get("studentId") ?? "", 10);
    if (isNaN(studentId)) {
      return NextResponse.json({ error: "Mã học sinh không hợp lệ." }, { status: 400 });
    }

    await classRepository.removeStudent(classId, session.userId, studentId);
    return NextResponse.json({
      success: true,
      message: "Xóa học sinh khỏi lớp thành công.",
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Xóa học sinh thất bại." }, { status: 500 });
  }
}
