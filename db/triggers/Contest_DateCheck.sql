CREATE OR ALTER TRIGGER trg_Contest_DateCheck
ON dbo.Contests
AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted WHERE EndTime <= StartTime)
    BEGIN
        RAISERROR(N'Thời gian kết thúc phải sau thời gian bắt đầu!', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
GO
