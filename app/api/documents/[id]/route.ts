import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { documentRepository } from "@/modules/document/repo";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    if (session.role !== "Teacher" && session.role !== "Admin") {
      return NextResponse.json(
        { error: "Chỉ giáo viên hoặc quản trị viên mới có thể xóa tài liệu." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const documentId = parseInt(id, 10);
    if (isNaN(documentId)) {
      return NextResponse.json({ error: "Mã tài liệu không hợp lệ." }, { status: 400 });
    }

    await documentRepository.deleteDocument(documentId, session.userId);

    return NextResponse.json({
      success: true,
      message: "Xóa tài liệu thành công.",
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Xóa tài liệu thất bại." },
      { status: 500 }
    );
  }
}
