CREATE OR ALTER TRIGGER dbo.trg_ClassStudent_PreventTeacherEnrollment
ON dbo.Class_Student
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1 
        FROM inserted i
        INNER JOIN dbo.Classes c ON i.ClassID = c.ClassID
        WHERE i.UserID = c.TeacherID
    )
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50027, 'Giao vien khong the tham gia lop hoc do chinh minh quan ly.', 1;
    END;
END;
GO
