import { NextRequest, NextResponse } from "next/server";
import { DomainError } from "@/db/exec";
import { contestRepository } from "@/modules/contest/repo";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contestId = parseInt(id, 10);
    if (isNaN(contestId)) {
      return NextResponse.json({ error: "Mã kỳ thi không hợp lệ." }, { status: 400 });
    }

    const leaderboard = await contestRepository.getLeaderboard(contestId);
    return NextResponse.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Không thể lấy bảng xếp hạng." }, { status: 500 });
  }
}
