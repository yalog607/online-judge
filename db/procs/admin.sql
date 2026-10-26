

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

-- Toàn bộ hoạt động quản trị (nhật ký kiểm toán) có phân trang, mới nhất trước.
CREATE OR ALTER PROCEDURE app.usp_Admin_ListAudit
    @ActorID INT,
    @Page INT = 1,
    @PageSize INT = 30
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin')
        THROW 50031, N'Bạn không có quyền truy cập.', 1;

    IF @Page < 1 SET @Page = 1;
    IF @PageSize < 1 SET @PageSize = 30;
    IF @PageSize > 100 SET @PageSize = 100;

    SELECT
        a.AuditID, a.Action, a.TargetType, a.TargetID, a.Detail, a.CreatedAt,
        ISNULL(u.FullName, N'Không xác định') AS ActorName,
        t.FullName AS TargetName,
        COUNT(*) OVER () AS TotalCount
    FROM dbo.AuditLog a
    LEFT JOIN dbo.Users u ON u.UserID = a.ActorID
    LEFT JOIN dbo.Users t ON a.TargetType = 'User' AND t.UserID = a.TargetID
    ORDER BY a.CreatedAt DESC, a.AuditID DESC
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO
