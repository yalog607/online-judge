import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { classRepository } from "@/modules/class/repo";
import { exportClassStudentsToExcel } from "@/modules/class/excel";

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

    const classDetail = await classRepository.getTeacherClassView(classId, session.userId);
    if (!classDetail) {
      return NextResponse.json({ error: "Lớp học không tồn tại." }, { status: 404 });
    }

    const students = await classRepository.getClassStudents(classId, session.userId);

    const excelBuffer = await exportClassStudentsToExcel(
      {
        className: classDetail.ClassName,
        inviteCode: classDetail.InviteCode,
        teacherName: classDetail.TeacherName,
      },
      students
    );

    const sanitizedClassName = classDetail.ClassName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Danh_sach_lop_${sanitizedClassName}_${classId}.xlsx`;

    return new NextResponse(excelBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Không thể xuất danh sách học viên." },
      { status: 500 }
    );
  }
}
