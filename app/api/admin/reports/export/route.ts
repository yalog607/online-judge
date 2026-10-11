import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { getClassReport, getContestReport, generateExcelReport } from "@/modules/report/service";
import { reportQuerySchema } from "@/modules/report/schema";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "Admin") {
      return NextResponse.json(
        { error: "Bạn không có quyền truy cập chức năng này." },
        { status: 401 },
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const parsed = reportQuerySchema.safeParse({
      type: searchParams.get("type") || "class",
      id: searchParams.get("id"),
    });

    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json(
        { error: "Vui lòng chọn lớp học hoặc kỳ thi hợp lệ để xuất báo cáo." },
        { status: 400 },
      );
    }

    const { type, id } = parsed.data;

    let buffer: Buffer;
    let filename: string;

    if (type === "class") {
      const { summary, problems, students } = await getClassReport(session.userId, id);
      if (!summary) {
        return NextResponse.json({ error: "Không tìm thấy dữ liệu lớp học." }, { status: 404 });
      }

      buffer = await generateExcelReport({
        type: "class",
        title: `Báo cáo Lớp học - ${summary.ClassName}`,
        summary: {
          name: summary.ClassName,
          targetType: "Lớp học",
          creatorOrTeacher: summary.TeacherName,
          totalPeople: summary.TotalStudents,
          totalProblems: summary.TotalProblems,
          totalSubmissions: summary.TotalSubmissions,
          totalAC: summary.TotalAC,
          totalFailed: summary.TotalFailed,
          passRatePercent: summary.PassRatePercent,
          waCount: summary.TotalWA,
          tleCount: summary.TotalTLE,
          reCount: summary.TotalRE,
          ceCount: summary.TotalCE,
        },
        problems: problems.map((p) => ({
          id: p.ProblemID,
          title: p.Title,
          extraLabel: p.Difficulty,
          totalSubmissions: p.TotalSubmissions,
          totalAC: p.TotalAC,
          totalFailed: p.TotalFailed,
          passRatePercent: p.PassRatePercent,
          solvedPeopleCount: p.SolvedStudentCount,
        })),
        people: students.map((s) => ({
          id: s.UserID,
          fullName: s.FullName,
          username: s.Username,
          email: s.Email,
          scoreOrProgress: s.ProgressPercent,
          totalSubmissions: s.TotalSubmissions,
          totalAC: s.TotalAC,
          totalFailed: s.TotalFailed,
          problemsSolved: s.ProblemsSolved,
          passRatePercent: s.PassRatePercent,
        })),
      });

      filename = `Bao_Cao_Lop_${summary.ClassName.replace(/[^\w]/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else {
      const { summary, problems, participants } = await getContestReport(session.userId, id);
      if (!summary) {
        return NextResponse.json({ error: "Không tìm thấy dữ liệu kỳ thi." }, { status: 404 });
      }

      buffer = await generateExcelReport({
        type: "contest",
        title: `Báo cáo Kỳ thi - ${summary.ContestName}`,
        summary: {
          name: summary.ContestName,
          targetType: "Kỳ thi",
          creatorOrTeacher: "Admin / Giảng viên",
          totalPeople: summary.TotalParticipants,
          totalProblems: summary.TotalProblems,
          totalSubmissions: summary.TotalSubmissions,
          totalAC: summary.TotalAC,
          totalFailed: summary.TotalFailed,
          passRatePercent: summary.PassRatePercent,
          waCount: summary.TotalWA,
          tleCount: summary.TotalTLE,
          reCount: summary.TotalRE,
          ceCount: summary.TotalCE,
        },
        problems: problems.map((p) => ({
          id: p.ProblemID,
          title: p.Title,
          extraLabel: `${p.MaxScore}đ`,
          totalSubmissions: p.TotalSubmissions,
          totalAC: p.TotalAC,
          totalFailed: p.TotalFailed,
          passRatePercent: p.PassRatePercent,
          solvedPeopleCount: p.SolvedParticipantCount,
        })),
        people: participants.map((pt) => ({
          id: pt.UserID,
          fullName: pt.FullName,
          username: pt.Username,
          email: pt.Email,
          scoreOrProgress: pt.TotalScore,
          totalSubmissions: pt.TotalSubmissions,
          totalAC: pt.TotalAC,
          totalFailed: pt.TotalFailed,
          problemsSolved: pt.ProblemsSolved,
          passRatePercent: pt.PassRatePercent,
        })),
      });

      filename = `Bao_Cao_Ky_Thi_${summary.ContestName.replace(/[^\w]/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    }

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Export report error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi tạo file báo cáo Excel." },
      { status: 500 },
    );
  }
}
