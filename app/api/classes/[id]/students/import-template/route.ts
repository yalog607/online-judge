import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { generateClassStudentImportTemplate } from "@/modules/class/excel";

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

    const templateBuffer = await generateClassStudentImportTemplate();

    return new NextResponse(templateBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Mau_nhap_hoc_vien_ITOJ.xlsx"`,
      },
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Không thể tải tệp mẫu." },
      { status: 500 }
    );
  }
}
