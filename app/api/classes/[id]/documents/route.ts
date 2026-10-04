import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { uploadFile } from "@/lib/storage";
import { documentRepository } from "@/modules/document/repo";
import {
  uploadDocumentSchema,
  listDocumentQuerySchema,
  validateDocumentFile,
} from "@/modules/document/schema";

export async function GET(
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
    const parsedQuery = listDocumentQuerySchema.safeParse(Object.fromEntries(searchParams));
    const category = parsedQuery.success ? parsedQuery.data.category : undefined;

    const documents = await documentRepository.listDocuments(
      classId,
      session.userId,
      category
    );

    return NextResponse.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Không thể lấy danh sách tài liệu." },
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

    if (session.role !== "Teacher" && session.role !== "Admin") {
      return NextResponse.json(
        { error: "Chỉ giáo viên hoặc quản trị viên mới có thể tải lên tài liệu." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const classId = parseInt(id, 10);
    if (isNaN(classId)) {
      return NextResponse.json({ error: "Mã lớp học không hợp lệ." }, { status: 400 });
    }

    const contentType = req.headers.get("content-type") || "";
    let fileName = "";
    let cloudinaryUrl = "";
    let category: string | undefined | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file || file.size === 0) {
        return NextResponse.json(
          { error: "Vui lòng chọn tập tin tài liệu cần tải lên." },
          { status: 400 }
        );
      }

      const fileType = (formData.get("fileType") as string)?.trim() || null;
      const validation = validateDocumentFile(file.name, fileType);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      fileName = (formData.get("fileName") as string)?.trim() || file.name;
      category = (formData.get("category") as string)?.trim() || null;
      const buffer = Buffer.from(await file.arrayBuffer());
      cloudinaryUrl = await uploadFile(buffer, `classes/${classId}/documents`, file.name);
    } else {
      const body = await req.json();
      fileName = body.fileName;
      cloudinaryUrl = body.cloudinaryUrl;
      category = body.category;
    }

    const parsed = uploadDocumentSchema.safeParse({
      fileName,
      cloudinaryUrl,
      category,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const document = await documentRepository.addDocument(
      classId,
      session.userId,
      parsed.data
    );

    return NextResponse.json(
      {
        success: true,
        message: "Tải tài liệu lên thành công.",
        data: document,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Tải tài liệu lên thất bại.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
