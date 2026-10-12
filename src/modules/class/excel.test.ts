import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import {
  generateClassStudentImportTemplate,
  exportClassStudentsToExcel,
  parseClassStudentsFromExcel,
} from "./excel";
import type { StudentItem } from "./repo";

describe("Class Excel Module", () => {
  it("should generate import template with valid structure", async () => {
    const buffer = await generateClassStudentImportTemplate();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const worksheet = workbook.getWorksheet("Mau_Nhap_Hoc_Vien");
    expect(worksheet).toBeDefined();

    const parsed = await parseClassStudentsFromExcel(buffer);
    expect(parsed.length).toBe(3);
    expect(parsed[0].identifier).toBe("sv2021001");
    expect(parsed[1].identifier).toBe("student2@example.com");
  });

  it("should export student list to excel properly", async () => {
    const mockStudents: StudentItem[] = [
      {
        ClassID: 1,
        UserID: 10,
        Username: "student01",
        FullName: "Nguyen Van A",
        Email: "nva@example.com",
        JoinDate: new Date().toISOString(),
        ProgressPercent: 85.5,
        IsTA: false,
      },
      {
        ClassID: 1,
        UserID: 11,
        Username: "ta_student",
        FullName: "Tran Van B",
        Email: "tvb@example.com",
        JoinDate: new Date().toISOString(),
        ProgressPercent: 100,
        IsTA: true,
      },
    ];

    const buffer = await exportClassStudentsToExcel(
      {
        className: "Lop Lap Trinh C++",
        inviteCode: "CPP123",
        teacherName: "TS. Le Hoang Nam",
      },
      mockStudents
    );

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const worksheet = workbook.getWorksheet("Danh_Sach_Hoc_Vien");
    expect(worksheet).toBeDefined();
    expect(worksheet?.getCell("B2").value).toBe("TS. Le Hoang Nam");
    expect(worksheet?.getCell("B3").value).toBe("CPP123");
    expect(worksheet?.getCell("B4").value).toBe(2);
  });

  it("should parse custom excel files with identifier column", async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Students");
    worksheet.addRow(["STT", "MSSV / Tên đăng nhập", "Họ tên"]);
    worksheet.addRow([1, "21110001", "Le Van C"]);
    worksheet.addRow([2, "21110002", "Pham Thi D"]);

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = await parseClassStudentsFromExcel(buffer);
    expect(parsed.length).toBe(2);
    expect(parsed[0].identifier).toBe("21110001");
    expect(parsed[1].identifier).toBe("21110002");
  });
});
