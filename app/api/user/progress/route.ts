import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { getUserPersonalProgress } from "@/modules/report/repo";

export async function GET() {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const data = await getUserPersonalProgress(session.userId, session.userId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Không thể lấy báo cáo tiến bộ cá nhân." },
      { status: 500 }
    );
  }
}
