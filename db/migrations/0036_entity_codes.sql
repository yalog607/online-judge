-- Thêm mã hiển thị cho bài tập (BT###), kỳ thi (KT###), lớp học (LH###).
-- Cột tính toán PERSISTED từ ID: dữ liệu cũ có mã ngay, không cần sửa các proc tạo mới; ID >= 1000 không bị cắt.
-- Chạy lại nhiều lần an toàn.

IF COL_LENGTH('dbo.Problems', 'ProblemCode') IS NULL
    ALTER TABLE dbo.Problems ADD ProblemCode AS (
        CAST('BT' + CASE WHEN ProblemID < 1000 THEN RIGHT('000' + CAST(ProblemID AS VARCHAR(10)), 3) ELSE CAST(ProblemID AS VARCHAR(10)) END AS VARCHAR(16))
    ) PERSISTED;
GO

IF COL_LENGTH('dbo.Contests', 'ContestCode') IS NULL
    ALTER TABLE dbo.Contests ADD ContestCode AS (
        CAST('KT' + CASE WHEN ContestID < 1000 THEN RIGHT('000' + CAST(ContestID AS VARCHAR(10)), 3) ELSE CAST(ContestID AS VARCHAR(10)) END AS VARCHAR(16))
    ) PERSISTED;
GO

IF COL_LENGTH('dbo.Classes', 'ClassCode') IS NULL
    ALTER TABLE dbo.Classes ADD ClassCode AS (
        CAST('LH' + CASE WHEN ClassID < 1000 THEN RIGHT('000' + CAST(ClassID AS VARCHAR(10)), 3) ELSE CAST(ClassID AS VARCHAR(10)) END AS VARCHAR(16))
    ) PERSISTED;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Problems_ProblemCode' AND object_id = OBJECT_ID('dbo.Problems'))
    CREATE UNIQUE INDEX UX_Problems_ProblemCode ON dbo.Problems (ProblemCode);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Contests_ContestCode' AND object_id = OBJECT_ID('dbo.Contests'))
    CREATE UNIQUE INDEX UX_Contests_ContestCode ON dbo.Contests (ContestCode);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Classes_ClassCode' AND object_id = OBJECT_ID('dbo.Classes'))
    CREATE UNIQUE INDEX UX_Classes_ClassCode ON dbo.Classes (ClassCode);
GO
