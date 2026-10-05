import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { contestRepository } from "@/modules/contest/repo";
import { contestFilterSchema, createContestSchema } from "@/modules/contest/schema";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const filter = contestFilterSchema.parse({
      status: url.searchParams.get("status") || "All",
      classId: url.searchParams.get("classId") || undefined,
      search: url.searchParams.get("search") || undefined,
      page: url.searchParams.get("page") || 1,
      pageSize: url.searchParams.get("pageSize") || 20,
    });

    const result = await contestRepository.listContests(filter);
    return NextResponse.json({
      success: true,
      data: result.items,
      total: result.total,
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Không thể lấy danh sách kỳ thi." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    if (session.role !== "Teacher" && session.role !== "Admin") {
      return NextResponse.json(
        { error: "Chỉ giáo viên hoặc quản trị viên mới có thể tạo kỳ thi." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createContestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const result = await contestRepository.createContest(session.userId, parsed.data);
    return NextResponse.json({
      success: true,
      message: "Tạo kỳ thi thành công.",
      data: result,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Tạo kỳ thi thất bại." }, { status: 500 });
  }
}
