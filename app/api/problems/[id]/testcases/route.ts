import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import * as problemRepo from "@/modules/problem/repo";
import { testcaseInputSchema } from "@/modules/problem/schema";

const replaceTestcasesSchema = z.object({
  testcases: z.array(testcaseInputSchema).min(1, "Phải có ít nhất 1 testcase"),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const problemId = parseInt(id, 10);
    if (isNaN(problemId)) {
      return NextResponse.json({ error: "Mã bài tập không hợp lệ." }, { status: 400 });
    }

    const session = await verifySession();
    if (session && (session.role === "Teacher" || session.role === "Admin")) {
      try {
        const fullTestcases = await problemRepo.listOwnerTestcases(problemId, session.userId);
        return NextResponse.json({ success: true, data: fullTestcases });
      } catch {
        const publicCases = await problemRepo.listPublicTestcases(problemId);
        return NextResponse.json({ success: true, data: publicCases });
      }
    }

    const publicTestcases = await problemRepo.listPublicTestcases(problemId);
    return NextResponse.json({
      success: true,
      data: publicTestcases,
    });
  } catch {
    return NextResponse.json(
      { error: "Không thể lấy danh sách testcase." },
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
    const problemId = parseInt(id, 10);
    if (isNaN(problemId)) {
      return NextResponse.json({ error: "Mã bài tập không hợp lệ." }, { status: 400 });
    }

    const body = await req.json();
    const parsed = replaceTestcasesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await problemRepo.replaceTestcases(problemId, session.userId, parsed.data.testcases);
    return NextResponse.json({
      success: true,
      message: "Cập nhật testcase thành công.",
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Cập nhật testcase thất bại." },
      { status: 500 }
    );
  }
}
