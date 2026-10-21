

CREATE OR ALTER PROCEDURE app.usp_Admin_ChangeUserRole
    @AdminID INT,
    @TargetUserID INT,
    @NewRole VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @AdminID AND Role = 'Admin')
            THROW 50016, N'Chi co quan tri vien moi co quyen thay doi vai tro tai khoan.', 1;

        IF @NewRole NOT IN ('User', 'TA', 'Teacher', 'Admin')
            THROW 50017, N'Vai tro moi khong hop le.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.Users
        SET Role = @NewRole
        WHERE UserID = @TargetUserID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Admin_DemoteTeacher
    @AdminID INT,
    @TeacherID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @AdminID AND Role = 'Admin')
            THROW 50018, N'Chi co quan tri vien toi cao moi duoc quyen giang chuc giang vien.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.Classes
        SET TeacherID = @AdminID
        WHERE TeacherID = @TeacherID;

        UPDATE dbo.Problems
        SET CreatorID = @AdminID
        WHERE CreatorID = @TeacherID;

        UPDATE dbo.Users
        SET Role = 'User'
        WHERE UserID = @TeacherID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
