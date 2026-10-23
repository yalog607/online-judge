import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { classRepository } from "@/modules/class/repo";
import { parseClassStudentsFromExcel } from "@/modules/class/excel";

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

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Vui lòng chọn tệp Excel để tải lên." },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Dung lượng tệp vượt quá giới hạn cho phép (5MB)." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsedRows = await parseClassStudentsFromExcel(buffer);
    if (parsedRows.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy dòng dữ liệu học viên nào trong tệp Excel." },
        { status: 400 }
      );
    }

    const identifiers = parsedRows.map((r) => r.identifier);
    const summary = await classRepository.importStudents(
      classId,
      session.userId,
      identifiers
    );

    revalidatePath(`/teacher/classes/${classId}`);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Không thể nhập học viên từ tệp Excel." },
      { status: 500 }
    );
  }
}
