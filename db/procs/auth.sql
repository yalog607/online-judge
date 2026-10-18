CREATE OR ALTER PROCEDURE app.usp_Auth_RequestOtp
    @Email VARCHAR(100),
    @Purpose VARCHAR(20),
    @CodeHash VARCHAR(255),
    @ExpiresAt DATETIME2(0),
    @Payload NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @Purpose = 'Register' AND EXISTS (SELECT 1 FROM dbo.Users WHERE Email = @Email)
        THROW 50001, N'Email đã được đăng ký.', 1;
    IF @Purpose = 'Reset' AND NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = @Email)
        THROW 50002, N'Email chưa được đăng ký.', 1;

    DECLARE @WaitSeconds INT;
    SELECT @WaitSeconds = 60 - IIF(DATEDIFF(SECOND, MAX(CreatedAt), SYSUTCDATETIME()) < 0, 0, DATEDIFF(SECOND, MAX(CreatedAt), SYSUTCDATETIME()))
    FROM dbo.OtpCodes
    WHERE Email = @Email AND Purpose = @Purpose;
    IF @WaitSeconds > 0
    BEGIN
        DECLARE @Msg NVARCHAR(200) = CONCAT(N'Vui lòng đợi ', @WaitSeconds, N' giây trước khi yêu cầu mã mới.');
        THROW 50003, @Msg, 1;
    END

    UPDATE dbo.OtpCodes SET ConsumedAt = SYSUTCDATETIME()
    WHERE Email = @Email AND Purpose = @Purpose AND ConsumedAt IS NULL;

    INSERT dbo.OtpCodes (Email, Purpose, CodeHash, Payload, ExpiresAt)
    VALUES (@Email, @Purpose, @CodeHash, @Payload, @ExpiresAt);
    SELECT SCOPE_IDENTITY() AS OtpID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Auth_GetOtp
    @Email VARCHAR(100),
    @Purpose VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 OtpID, CodeHash, Payload, Attempts, ExpiresAt
    FROM dbo.OtpCodes
    WHERE Email = @Email AND Purpose = @Purpose AND ConsumedAt IS NULL
    ORDER BY CreatedAt DESC;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Auth_RegisterOtpAttempt
    @OtpID INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.OtpCodes SET Attempts = Attempts + 1 WHERE OtpID = @OtpID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Auth_ConsumeOtpAndRegister
    @OtpID INT,
    @Email VARCHAR(100),
    @Username VARCHAR(50),
    @PasswordHash VARCHAR(255),
    @FullName NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.OtpCodes
        WHERE OtpID = @OtpID AND Email = @Email AND Purpose = 'Register'
          AND ConsumedAt IS NULL AND ExpiresAt > SYSUTCDATETIME()
    )
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50003, N'Mã OTP không hợp lệ hoặc đã hết hạn.', 1;
    END

    UPDATE dbo.OtpCodes SET ConsumedAt = SYSUTCDATETIME() WHERE OtpID = @OtpID;

    INSERT dbo.Users (Username, Password, Email, FullName)
    VALUES (@Username, @PasswordHash, @Email, @FullName);

    SELECT SCOPE_IDENTITY() AS UserID;
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Auth_ConsumeOtpAndResetPassword
    @OtpID INT,
    @Email VARCHAR(100),
    @PasswordHash VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.OtpCodes
        WHERE OtpID = @OtpID AND Email = @Email AND Purpose = 'Reset'
          AND ConsumedAt IS NULL AND ExpiresAt > SYSUTCDATETIME()
    )
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50003, N'Mã OTP không hợp lệ hoặc đã hết hạn.', 1;
    END

    UPDATE dbo.OtpCodes SET ConsumedAt = SYSUTCDATETIME() WHERE OtpID = @OtpID;
    UPDATE dbo.Users SET Password = @PasswordHash WHERE Email = @Email;

    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Auth_GetUserByEmail
    @Email VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UserID, Username, Password, Email, FullName, Role, Status, Avatar
    FROM dbo.Users WHERE Email = @Email;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Auth_GetUserById
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UserID, Username, Password, Email, FullName, Role, Status, Avatar
    FROM dbo.Users WHERE UserID = @UserID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Auth_UpdateProfile
    @UserID INT,
    @FullName NVARCHAR(100),
    @Avatar VARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE dbo.Users
        SET FullName = @FullName,
            Avatar = COALESCE(@Avatar, Avatar)
        WHERE UserID = @UserID;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR (@ErrorMessage, 16, 1);
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE app.usp_Auth_ChangePassword
    @UserID INT,
    @NewPasswordHash VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE dbo.Users SET Password = @NewPasswordHash WHERE UserID = @UserID;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR (@ErrorMessage, 16, 1);
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE app.usp_Admin_SetUserStatus
    @ActorID INT,
    @UserID INT,
    @Status VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin')
        THROW 50030, N'Bạn không có quyền thực hiện thao tác này.', 1;

    IF @Status NOT IN ('Active', 'Locked')
        THROW 50031, N'Trạng thái người dùng không hợp lệ.', 1;

    IF @ActorID = @UserID AND @Status = 'Locked'
        THROW 50032, N'Không thể tự khóa tài khoản của chính mình.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID)
        THROW 50033, N'Người dùng không tồn tại.', 1;

    IF @Status = 'Locked' AND EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role = 'Admin')
        THROW 50032, N'Không thể khóa tài khoản quản trị viên.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.Users SET Status = @Status WHERE UserID = @UserID;

        IF @Status = 'Locked'
            UPDATE dbo.Sessions SET RevokedAt = SYSUTCDATETIME()
            WHERE UserID = @UserID AND RevokedAt IS NULL;

        INSERT dbo.AuditLog (ActorID, Action, TargetType, TargetID, Detail)
        VALUES (@ActorID, 'SetUserStatus', 'User', @UserID, @Status);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE app.usp_Admin_SetUserRole
    @ActorID INT,
    @UserID INT,
    @Role VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin')
        THROW 50030, N'Bạn không có quyền thực hiện thao tác này.', 1;

    IF @Role NOT IN ('User', 'TA', 'Teacher')
        THROW 50035, N'Vai trò không hợp lệ.', 1;

    IF @ActorID = @UserID
        THROW 50034, N'Không thể tự thay đổi vai trò của chính mình.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID)
        THROW 50033, N'Người dùng không tồn tại.', 1;

    IF EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role = 'Admin')
        THROW 50036, N'Không thể thay đổi vai trò của quản trị viên.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @OldRole VARCHAR(20);
        SELECT @OldRole = Role FROM dbo.Users WHERE UserID = @UserID;

        -- Giáng chức giảng viên: chuyển lớp và kỳ thi chưa kết thúc cho admin thực hiện.
        IF @OldRole = 'Teacher' AND @Role <> 'Teacher'
        BEGIN
            UPDATE dbo.Classes SET TeacherID = @ActorID
            WHERE TeacherID = @UserID AND IsCancelled = 0;

            UPDATE dbo.Contests SET CreatorID = @ActorID
            WHERE CreatorID = @UserID AND EndTime > SYSUTCDATETIME();
        END;

        -- Rời vai TA: gỡ quyền hỗ trợ ở mọi lớp.
        IF @OldRole = 'TA' AND @Role <> 'TA'
            DELETE FROM dbo.Class_TA WHERE UserID_TA = @UserID;

        UPDATE dbo.Users SET Role = @Role WHERE UserID = @UserID;

        INSERT dbo.AuditLog (ActorID, Action, TargetType, TargetID, Detail)
        VALUES (@ActorID, 'SetUserRole', 'User', @UserID, @Role);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE app.usp_Admin_ListTeachers
    @ActorID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin')
        THROW 50030, N'Bạn không có quyền thực hiện thao tác này.', 1;

    SELECT UserID, FullName, Username
    FROM dbo.Users
    WHERE Role = 'Teacher' AND Status = 'Active'
    ORDER BY FullName;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Admin_ListOwnedItems
    @ActorID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin')
        THROW 50030, N'Bạn không có quyền thực hiện thao tác này.', 1;

    SELECT 'Class' AS ItemType, ClassID AS ItemID, ClassName AS Name
    FROM dbo.Classes
    WHERE TeacherID = @UserID AND IsCancelled = 0
    UNION ALL
    SELECT 'Contest', ContestID, ContestName
    FROM dbo.Contests
    WHERE CreatorID = @UserID AND EndTime > SYSUTCDATETIME()
    UNION ALL
    SELECT 'Problem', ProblemID, Title
    FROM dbo.Problems
    WHERE CreatorID = @UserID
    ORDER BY ItemType, Name;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Admin_TransferOwnership
    @ActorID INT,
    @ItemType VARCHAR(20),
    @ItemID INT,
    @NewOwnerID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin')
        THROW 50030, N'Bạn không có quyền thực hiện thao tác này.', 1;

    IF @ItemType NOT IN ('Class', 'Contest', 'Problem')
        THROW 50060, N'Loại đối tượng không hợp lệ.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @NewOwnerID AND Role = 'Teacher' AND Status = 'Active')
        THROW 50061, N'Người nhận phải là giảng viên đang hoạt động.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @OldOwnerID INT;

        IF @ItemType = 'Class'
        BEGIN
            SELECT @OldOwnerID = TeacherID FROM dbo.Classes WHERE ClassID = @ItemID AND IsCancelled = 0;
            IF @OldOwnerID IS NULL THROW 50062, N'Lớp học không tồn tại hoặc đã bị hủy.', 1;
            IF @OldOwnerID = @NewOwnerID THROW 50063, N'Người nhận đã là chủ sở hữu hiện tại.', 1;
            IF EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @ItemID AND UserID = @NewOwnerID)
                THROW 50064, N'Người nhận đang là học viên của lớp này.', 1;

            DELETE FROM dbo.Class_TA WHERE ClassID = @ItemID AND UserID_TA = @NewOwnerID;
            UPDATE dbo.Classes SET TeacherID = @NewOwnerID WHERE ClassID = @ItemID;
        END
        ELSE IF @ItemType = 'Contest'
        BEGIN
            SELECT @OldOwnerID = CreatorID FROM dbo.Contests WHERE ContestID = @ItemID;
            IF @OldOwnerID IS NULL THROW 50062, N'Kỳ thi không tồn tại.', 1;
            IF @OldOwnerID = @NewOwnerID THROW 50063, N'Người nhận đã là chủ sở hữu hiện tại.', 1;

            UPDATE dbo.Contests SET CreatorID = @NewOwnerID WHERE ContestID = @ItemID;
        END
        ELSE
        BEGIN
            SELECT @OldOwnerID = CreatorID FROM dbo.Problems WHERE ProblemID = @ItemID;
            IF @OldOwnerID IS NULL THROW 50062, N'Bài tập không tồn tại.', 1;
            IF @OldOwnerID = @NewOwnerID THROW 50063, N'Người nhận đã là chủ sở hữu hiện tại.', 1;

            UPDATE dbo.Problems SET CreatorID = @NewOwnerID WHERE ProblemID = @ItemID;
        END;

        INSERT dbo.AuditLog (ActorID, Action, TargetType, TargetID, Detail)
        VALUES (@ActorID, 'TransferOwnership', @ItemType, @ItemID,
                CONCAT(@OldOwnerID, N'->', @NewOwnerID));

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE app.usp_Admin_ListUsers
    @ActorID INT,
    @Search NVARCHAR(100) = NULL,
    @Role VARCHAR(20) = NULL,
    @Status VARCHAR(20) = NULL,
    @Page INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin')
        THROW 50030, N'Bạn không có quyền truy cập.', 1;

    IF @Page < 1 SET @Page = 1;
    IF @PageSize < 1 SET @PageSize = 20;

    SELECT
        u.UserID,
        u.Username,
        u.Email,
        u.FullName,
        u.Role,
        u.Status,
        u.Avatar,
        u.CreatedAt,
        COUNT(*) OVER () AS TotalCount
    FROM dbo.Users u
    WHERE (@Search IS NULL OR u.Username LIKE '%' + @Search + '%' OR u.Email LIKE '%' + @Search + '%' OR u.FullName LIKE '%' + @Search + '%')
      AND (@Role IS NULL OR u.Role = @Role)
      AND (@Status IS NULL OR u.Status = @Status)
    ORDER BY u.UserID DESC
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Admin_ValidateImpersonate
    @ActorID INT,
    @TargetUserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Allowed BIT = app.ufn_CanImpersonateUser(@ActorID, @TargetUserID);

    IF @Allowed = 1
    BEGIN
        BEGIN TRY
            BEGIN TRANSACTION;

            INSERT dbo.AuditLog (ActorID, Action, TargetType, TargetID)
            VALUES (@ActorID, 'ImpersonateStart', 'User', @TargetUserID);

            COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;
            THROW;
        END CATCH
    END;

    SELECT @Allowed AS Allowed;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Auth_RegisterDirect
    @Username VARCHAR(50),
    @Email VARCHAR(100),
    @PasswordHash VARCHAR(255),
    @FullName NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF EXISTS (SELECT 1 FROM dbo.Users WHERE Email = @Email)
        BEGIN
            THROW 50001, N'Email đã được đăng ký.', 1;
        END;

        IF EXISTS (SELECT 1 FROM dbo.Users WHERE Username = @Username)
        BEGIN
            THROW 50004, N'Tên đăng nhập đã được sử dụng.', 1;
        END;

        INSERT dbo.Users (Username, Password, Email, FullName, Role, Status)
        VALUES (@Username, @PasswordHash, @Email, @FullName, 'User', 'Active');

        DECLARE @NewUserID INT = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT @NewUserID AS UserID;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END
GO

