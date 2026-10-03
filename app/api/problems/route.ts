import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import * as problemRepo from "@/modules/problem/repo";
import { problemFormSchema } from "@/modules/problem/schema";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") ?? undefined;
    const tag = searchParams.get("tag") ?? undefined;
    const difficulty = (searchParams.get("difficulty") as problemRepo.Difficulty) ?? undefined;
    const userStatus = (searchParams.get("userStatus") as "done" | "tried" | "todo") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));

    const result = await problemRepo.listForUser({
      userId: session?.userId ?? 0,
      search,
      tag,
      difficulty,
      userStatus,
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        pageSize,
        total: result.total,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Không thể lấy danh sách bài tập." },
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
        { error: "Chỉ giáo viên hoặc quản trị viên mới có thể tạo bài tập." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = problemFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const problemId = await problemRepo.createProblem({
      creatorId: session.userId,
      ...parsed.data,
    });

    return NextResponse.json(
      {
        success: true,
        data: { problemId },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Tạo bài tập thất bại." },
      { status: 500 }
    );
  }
}
