CREATE OR ALTER TRIGGER trg_Submission_PreventDelete
ON dbo.Submissions
INSTEAD OF DELETE
AS
BEGIN
    RAISERROR(N'Không được phép xóa bài nộp của sinh viên!', 16, 1);
    ROLLBACK TRANSACTION;
END;
GO
