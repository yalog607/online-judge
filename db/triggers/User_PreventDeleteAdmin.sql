-- Không cho xóa tài khoản gốc 'admin' và không cho xóa Admin cuối cùng của hệ thống.
-- Dùng AFTER DELETE (không dùng INSTEAD OF) để các thao tác xóa User bình thường và FK vẫn chạy như cũ.
CREATE OR ALTER TRIGGER dbo.trg_Users_PreventDeleteAdmin
ON dbo.Users
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM deleted WHERE Role = 'Admin' AND Username = 'admin')
       OR (EXISTS (SELECT 1 FROM deleted WHERE Role = 'Admin')
           AND NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Role = 'Admin'))
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50049, N'Không được xóa tài khoản Admin gốc hoặc Admin cuối cùng của hệ thống.', 1;
    END;
END;
GO
