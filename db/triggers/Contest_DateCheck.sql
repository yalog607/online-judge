CREATE OR ALTER TRIGGER trg_Contest_DateCheck
ON dbo.Contests
AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted WHERE EndTime <= StartTime)
    BEGIN
        RAISERROR('Thoi gian ket thuc phai sau thoi gian bat dau!', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
GO
