CREATE OR ALTER TRIGGER trg_Submission_PreventDelete
ON dbo.Submissions
INSTEAD OF DELETE
AS
BEGIN
    RAISERROR('Khong duoc phep xoa bai nop cua sinh vien!', 16, 1);
    ROLLBACK TRANSACTION;
END;
GO
