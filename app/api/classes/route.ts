import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { classRepository } from "@/modules/class/repo";
import { createClassSchema, listClassQuerySchema } from "@/modules/class/schema";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession();
    const { searchParams } = new URL(req.url);
    const parsedQuery = listClassQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: parsedQuery.error.issues[0].message },
        { status: 400 }
      );
    }

    const { search, onlyMine, page, pageSize } = parsedQuery.data;
    const result = await classRepository.listClasses({
      userId: session?.userId,
      search,
      onlyMine,
      page: page ?? 1,
      pageSize: pageSize ?? 20,
    });

    return NextResponse.json({
      success: true,
      data: result.classes,
      pagination: {
        page: page ?? 1,
        pageSize: pageSize ?? 20,
        total: result.totalCount,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Không thể lấy danh sách lớp học." },
      { status: 500 }
    );
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
        { error: "Chỉ giáo viên hoặc quản trị viên mới có thể tạo lớp." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createClassSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await classRepository.createClass(session.userId, parsed.data);
    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Tạo lớp học thất bại." },
      { status: 500 }
    );
  }
}
