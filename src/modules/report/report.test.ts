import { describe, expect, it } from "vitest";
import { reportQuerySchema } from "./schema";
import { generateExcelReport } from "./excel";

describe("reportQuerySchema", () => {
  it("defaults type to class", () => {
    const res = reportQuerySchema.parse({});
    expect(res.type).toBe("class");
    expect(res.id).toBeUndefined();
  });

  it("parses valid params", () => {
    const res = reportQuerySchema.parse({ type: "contest", id: "15" });
    expect(res.type).toBe("contest");
    expect(res.id).toBe(15);
  });

  it("rejects invalid types or ids", () => {
    expect(() => reportQuerySchema.parse({ type: "unknown" })).toThrow();
    expect(() => reportQuerySchema.parse({ id: "-5" })).toThrow();
  });
});

describe("generateExcelReport", () => {
  it("creates a valid excel buffer with 3 sheets", async () => {
    const buffer = await generateExcelReport({
      type: "class",
      title: "Báo cáo lớp Test",
      summary: {
        name: "Lớp Lập trình C++",
        targetType: "Lớp học",
        creatorOrTeacher: "Thầy Hưng",
        totalPeople: 25,
        totalProblems: 5,
        totalSubmissions: 100,
        totalAC: 70,
        totalFailed: 30,
        passRatePercent: 70.0,
      },
      problems: [
        {
          id: 1,
          title: "Two Sum",
          extraLabel: "Easy",
          totalSubmissions: 30,
          totalAC: 25,
          totalFailed: 5,
          passRatePercent: 83.3,
          solvedPeopleCount: 20,
        },
      ],
      people: [
        {
          id: 10,
          fullName: "Nguyễn Văn A",
          username: "nguyenvana",
          email: "a@example.com",
          scoreOrProgress: 80,
          problemsSolved: 4,
          totalSubmissions: 10,
          totalAC: 8,
          totalFailed: 2,
          passRatePercent: 80.0,
        },
      ],
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
    // Standard zip magic number for .xlsx is PK\x03\x04
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });
});
