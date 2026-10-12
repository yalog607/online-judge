import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { documentRepository } from "@/modules/document/repo";
import { getDocumentMimeType } from "@/modules/document/schema";
import {
  extractCloudinaryPublicId,
  getPrivateDownloadUrl,
} from "@/lib/storage";

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
    const documentId = parseInt(id, 10);
    if (isNaN(documentId)) {
      return NextResponse.json({ error: "Mã tài liệu không hợp lệ." }, { status: 400 });
    }

    const doc = await documentRepository.getDocument(documentId, session.userId);
    if (!doc) {
      return NextResponse.json({ error: "Không tìm thấy tài liệu." }, { status: 404 });
    }

    const isDownload = req.nextUrl.searchParams.get("download") === "1";
    const mimeType = getDocumentMimeType(doc.FileName);
    const contentDisposition = `${isDownload ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(doc.FileName)}`;

    const cldInfo = extractCloudinaryPublicId(doc.CloudinaryURL);
    if (cldInfo) {
      const privateUrl = getPrivateDownloadUrl(cldInfo.publicId, cldInfo.resourceType);
      const upstreamRes = await fetch(privateUrl);
      if (upstreamRes.ok) {
        const buffer = Buffer.from(await upstreamRes.arrayBuffer());
        return new NextResponse(buffer as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Disposition": contentDisposition,
            "Content-Length": String(buffer.length),
          },
        });
      }
    }

    if (doc.CloudinaryURL.startsWith("http://") || doc.CloudinaryURL.startsWith("https://")) {
      const upstreamRes = await fetch(doc.CloudinaryURL);
      if (upstreamRes.ok) {
        const buffer = Buffer.from(await upstreamRes.arrayBuffer());
        return new NextResponse(buffer as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Disposition": contentDisposition,
            "Content-Length": String(buffer.length),
          },
        });
      }
    }

    const localRelative = doc.CloudinaryURL.startsWith("/")
      ? doc.CloudinaryURL.slice(1)
      : doc.CloudinaryURL;
    const localCandidates = [
      path.join(process.cwd(), "public", localRelative),
      path.join(process.cwd(), localRelative),
    ];

    for (const cand of localCandidates) {
      if (fs.existsSync(cand)) {
        const buffer = fs.readFileSync(cand);
        return new NextResponse(buffer as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Disposition": contentDisposition,
            "Content-Length": String(buffer.length),
          },
        });
      }
    }

    return NextResponse.json(
      { error: "Tập tin không còn tồn tại trên máy chủ lưu trữ." },
      { status: 404 }
    );
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Không thể tải tài liệu." },
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
