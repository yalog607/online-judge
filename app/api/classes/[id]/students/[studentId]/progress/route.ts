import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { classRepository } from "@/modules/class/repo";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const { id, studentId: rawStudentId } = await params;
    const classId = parseInt(id, 10);
    const studentId = parseInt(rawStudentId, 10);

    if (isNaN(classId) || isNaN(studentId)) {
      return NextResponse.json(
        { error: "Tham số lớp học hoặc sinh viên không hợp lệ." },
        { status: 400 }
      );
    }

    const data = await classRepository.getStudentProgressDetail(
      classId,
      studentId,
      session.userId
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Không thể lấy thông tin chi tiết tiến độ sinh viên." },
      { status: 500 }
    );
  }
}
