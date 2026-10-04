import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";

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
