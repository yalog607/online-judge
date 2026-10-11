import ExcelJS from "exceljs";

export type ExcelReportParams = {
  type: "class" | "contest";
  title: string;
  summary: {
    name: string;
    targetType: string;
    creatorOrTeacher: string;
    totalPeople: number;
    totalProblems: number;
    totalSubmissions: number;
    totalAC: number;
    totalFailed: number;
    passRatePercent: number;
    waCount?: number;
    tleCount?: number;
    reCount?: number;
    ceCount?: number;
  };
  problems: Array<{
    id: number;
    title: string;
    extraLabel?: string;
    totalSubmissions: number;
    totalAC: number;
    totalFailed: number;
    passRatePercent: number;
    solvedPeopleCount: number;
  }>;
  people: Array<{
    id: number;
    fullName: string;
    username: string;
    email: string;
    scoreOrProgress?: number;
    totalSubmissions: number;
    totalAC: number;
    totalFailed: number;
    problemsSolved: number;
    passRatePercent: number;
  }>;
};

export async function generateExcelReport(params: ExcelReportParams): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ITOJ System";
  workbook.created = new Date();

  const PRIMARY_COLOR = "2563EB"; // Blue

  // 1. SHEET TỔNG QUAN
  const summarySheet = workbook.addWorksheet("Tong_Quan", {
    views: [{ showGridLines: true }],
  });

  summarySheet.columns = [
    { header: "Chỉ số thống kê", key: "metric", width: 32 },
    { header: "Giá trị", key: "value", width: 40 },
  ];

  summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  summarySheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: PRIMARY_COLOR },
  };

  summarySheet.addRow({ metric: "Loại báo cáo", value: params.type === "class" ? "Lớp học" : "Kỳ thi" });
  summarySheet.addRow({ metric: "Tên đối tượng", value: params.summary.name });
  summarySheet.addRow({ metric: "Người phụ trách / Tạo", value: params.summary.creatorOrTeacher });
  summarySheet.addRow({
    metric: params.type === "class" ? "Số lượng học sinh" : "Số lượng thí sinh",
    value: params.summary.totalPeople,
  });
  summarySheet.addRow({ metric: "Số lượng bài tập", value: params.summary.totalProblems });
  summarySheet.addRow({ metric: "Tổng lượt nộp bài", value: params.summary.totalSubmissions });
  summarySheet.addRow({ metric: "Lượt nộp Đạt (AC)", value: params.summary.totalAC });
  summarySheet.addRow({ metric: "Lượt nộp Trượt (Non-AC)", value: params.summary.totalFailed });
  summarySheet.addRow({
    metric: "Tỉ lệ Đạt (Pass Rate)",
    value: `${params.summary.passRatePercent.toFixed(1)}%`,
  });
  summarySheet.addRow({ metric: "Thời gian xuất báo cáo", value: new Date().toLocaleString("vi-VN") });

  // 2. SHEET DANH SÁCH BÀI TẬP
  const problemSheet = workbook.addWorksheet("Danh_Sach_Bai_Tap", {
    views: [{ showGridLines: true }],
  });

  problemSheet.columns = [
    { header: "Mã bài", key: "id", width: 12 },
    { header: "Tên bài tập", key: "title", width: 35 },
    { header: "Độ khó / Điểm", key: "extra", width: 16 },
    { header: "Tổng lượt nộp", key: "totalSubmissions", width: 18 },
    { header: "Lượt Đạt (AC)", key: "totalAC", width: 16 },
    { header: "Lượt Trượt", key: "totalFailed", width: 16 },
    { header: "Tỉ lệ Đạt (%)", key: "passRatePercent", width: 16 },
    { header: "Số người giải được", key: "solvedCount", width: 20 },
  ];

  problemSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  problemSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: PRIMARY_COLOR },
  };

  params.problems.forEach((p) => {
    problemSheet.addRow({
      id: p.id,
      title: p.title,
      extra: p.extraLabel ?? "-",
      totalSubmissions: p.totalSubmissions,
      totalAC: p.totalAC,
      totalFailed: p.totalFailed,
      passRatePercent: `${p.passRatePercent.toFixed(1)}%`,
      solvedCount: p.solvedPeopleCount,
    });
  });

  // 3. SHEET DANH SÁCH THÀNH VIÊN / THÍ SINH
  const peopleSheet = workbook.addWorksheet(
    params.type === "class" ? "Danh_Sach_Hoc_Sinh" : "Danh_Sach_Thi_Sinh",
    { views: [{ showGridLines: true }] },
  );

  peopleSheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Họ và tên", key: "fullName", width: 28 },
    { header: "Tên đăng nhập", key: "username", width: 20 },
    { header: "Email", key: "email", width: 30 },
    {
      header: params.type === "class" ? "Tiến độ (%)" : "Điểm tổng",
      key: "scoreOrProgress",
      width: 16,
    },
    { header: "Số bài giải được", key: "problemsSolved", width: 18 },
    { header: "Tổng lượt nộp", key: "totalSubmissions", width: 16 },
    { header: "Lượt Đạt (AC)", key: "totalAC", width: 16 },
    { header: "Lượt Trượt", key: "totalFailed", width: 16 },
    { header: "Tỉ lệ Đạt (%)", key: "passRatePercent", width: 16 },
  ];

  peopleSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  peopleSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: PRIMARY_COLOR },
  };

  params.people.forEach((u) => {
    peopleSheet.addRow({
      id: u.id,
      fullName: u.fullName,
      username: `@${u.username}`,
      email: u.email,
      scoreOrProgress: u.scoreOrProgress !== undefined ? u.scoreOrProgress : "-",
      problemsSolved: u.problemsSolved,
      totalSubmissions: u.totalSubmissions,
      totalAC: u.totalAC,
      totalFailed: u.totalFailed,
      passRatePercent: `${u.passRatePercent.toFixed(1)}%`,
    });
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
