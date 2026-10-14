import ExcelJS from "exceljs";
import type { StudentItem } from "./repo";

export interface ParsedStudentRow {
  rowNumber: number;
  identifier: string;
}

function getCellString(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof (value as { text: unknown }).text === "string") {
      return (value as { text: string }).text.trim();
    }
    if ("result" in value && (value as { result: unknown }).result !== undefined) {
      return String((value as { result: unknown }).result).trim();
    }
    if ("richText" in value && Array.isArray((value as { richText: Array<{ text: string }> }).richText)) {
      return (value as { richText: Array<{ text: string }> }).richText
        .map((item) => item.text)
        .join("")
        .trim();
    }
  }
  return String(value).trim();
}

export async function exportClassStudentsToExcel(
  classInfo: {
    className: string;
    inviteCode?: string | null;
    teacherName: string;
  },
  students: StudentItem[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ITOJ System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Danh_Sach_Hoc_Vien", {
    views: [{ showGridLines: true }],
  });

  worksheet.mergeCells("A1:G1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = `DANH SÁCH HỌC VIÊN - ${classInfo.className.toUpperCase()}`;
  titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "2563EB" },
  };
  worksheet.getRow(1).height = 36;

  worksheet.getCell("A2").value = "Giảng viên:";
  worksheet.getCell("B2").value = classInfo.teacherName;
  worksheet.getCell("A3").value = "Mã mời lớp:";
  worksheet.getCell("B3").value = classInfo.inviteCode || "Không có";
  worksheet.getCell("A4").value = "Tổng số học viên:";
  worksheet.getCell("B4").value = students.length;
  worksheet.getCell("A5").value = "Ngày xuất file:";
  worksheet.getCell("B5").value = new Date().toLocaleString("vi-VN");

  for (let r = 2; r <= 5; r++) {
    worksheet.getCell(`A${r}`).font = { bold: true };
    worksheet.getCell(`B${r}`).font = { color: { argb: "1E293B" } };
  }

  const tableHeaderRowIndex = 7;
  const headerRow = worksheet.getRow(tableHeaderRowIndex);
  headerRow.values = [
    "STT",
    "MSSV / Tên đăng nhập",
    "Họ và tên",
    "Email",
    "Vai trò",
    "Ngày tham gia",
    "Tiến độ (%)",
  ];
  headerRow.height = 24;
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  for (let c = 1; c <= 7; c++) {
    const cell = headerRow.getCell(c);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1E40AF" },
    };
  }

  worksheet.columns = [
    { key: "stt", width: 8 },
    { key: "username", width: 22 },
    { key: "fullName", width: 28 },
    { key: "email", width: 32 },
    { key: "role", width: 16 },
    { key: "joinDate", width: 18 },
    { key: "progress", width: 16 },
  ];

  students.forEach((student, index) => {
    const rowIndex = tableHeaderRowIndex + 1 + index;
    const row = worksheet.getRow(rowIndex);
    row.values = [
      index + 1,
      student.Username,
      student.FullName,
      student.Email,
      student.IsTA ? "Trợ giảng" : "Học viên",
      new Date(student.JoinDate).toLocaleDateString("vi-VN"),
      `${student.ProgressPercent}%`,
    ];
    row.alignment = { vertical: "middle" };
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(5).alignment = { horizontal: "center" };
    row.getCell(6).alignment = { horizontal: "center" };
    row.getCell(7).alignment = { horizontal: "center" };

    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "CBD5E1" } },
      bottom: { style: "thin", color: { argb: "CBD5E1" } },
      left: { style: "thin", color: { argb: "CBD5E1" } },
      right: { style: "thin", color: { argb: "CBD5E1" } },
    };
    for (let c = 1; c <= 7; c++) {
      row.getCell(c).border = borderStyle;
    }
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function generateClassStudentImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ITOJ System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Mau_Nhap_Hoc_Vien", {
    views: [{ showGridLines: true }],
  });

  worksheet.mergeCells("A1:D1");
  const banner = worksheet.getCell("A1");
  banner.value = "MẪU NHẬP DANH SÁCH HỌC VIÊN VÀO LỚP HỌC (ITOJ)";
  banner.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  banner.alignment = { horizontal: "center", vertical: "middle" };
  banner.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "2563EB" },
  };
  worksheet.getRow(1).height = 32;

  worksheet.mergeCells("A2:D2");
  const guide = worksheet.getCell("A2");
  guide.value = "Lưu ý: Cột 'MSSV / Email' là bắt buộc. Hệ thống sẽ đối chiếu với tài khoản đã đăng ký trên ITOJ.";
  guide.font = { italic: true, size: 10, color: { argb: "475569" } };
  guide.alignment = { horizontal: "left", vertical: "middle" };
  worksheet.getRow(2).height = 20;

  const headerRow = worksheet.getRow(4);
  headerRow.values = [
    "STT",
    "MSSV / Email (Bắt buộc)",
    "Họ và tên (Tham khảo)",
    "Ghi chú (Tùy chọn)",
  ];
  headerRow.height = 24;
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  for (let c = 1; c <= 4; c++) {
    const cell = headerRow.getCell(c);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1E40AF" },
    };
  }

  worksheet.columns = [
    { key: "stt", width: 8 },
    { key: "identifier", width: 34 },
    { key: "fullName", width: 28 },
    { key: "note", width: 24 },
  ];

  const sampleData = [
    { stt: 1, identifier: "sv2021001", fullName: "Vũ Thu Hà", note: "Nhóm 1" },
    { stt: 2, identifier: "student2@example.com", fullName: "Phạm Đức Long", note: "Nhóm 1" },
    { stt: 3, identifier: "sv2021027", fullName: "Nguyễn Minh Anh", note: "Nhóm 2" },
  ];

  sampleData.forEach((item, index) => {
    const row = worksheet.getRow(5 + index);
    row.values = [item.stt, item.identifier, item.fullName, item.note];
    row.alignment = { vertical: "middle" };
    row.getCell(1).alignment = { horizontal: "center" };
    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "E2E8F0" } },
      bottom: { style: "thin", color: { argb: "E2E8F0" } },
      left: { style: "thin", color: { argb: "E2E8F0" } },
      right: { style: "thin", color: { argb: "E2E8F0" } },
    };
    for (let c = 1; c <= 4; c++) {
      row.getCell(c).border = borderStyle;
    }
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function parseClassStudentsFromExcel(
  buffer: Buffer
): Promise<ParsedStudentRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  let identifierColIndex = -1;
  let headerRowIndex = 1;

  for (let r = 1; r <= Math.min(10, worksheet.rowCount); r++) {
    const row = worksheet.getRow(r);
    for (let c = 1; c <= Math.min(15, row.cellCount); c++) {
      const headerText = getCellString(row.getCell(c)).toLowerCase();
      const isGuideText =
        headerText.includes("lưu ý") ||
        headerText.includes("hướng dẫn") ||
        headerText.includes("mẫu");
      if (
        !isGuideText &&
        headerText.length <= 40 &&
        (headerText.includes("mssv") ||
          headerText.includes("mã sv") ||
          headerText.includes("tên đăng nhập") ||
          headerText.includes("tài khoản") ||
          headerText.includes("username") ||
          headerText.includes("identifier") ||
          headerText.includes("email"))
      ) {
        identifierColIndex = c;
        headerRowIndex = r;
        break;
      }
    }
    if (identifierColIndex !== -1) break;
  }

  if (identifierColIndex === -1) {
    identifierColIndex = 2;
    headerRowIndex = 1;
  }

  const results: ParsedStudentRow[] = [];

  for (let r = headerRowIndex + 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const cellValue = getCellString(row.getCell(identifierColIndex));
    if (cellValue && cellValue.length > 0) {
      results.push({
        rowNumber: r,
        identifier: cellValue,
      });
    }
  }

  return results;
}
