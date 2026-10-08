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
        THROW 50001, 'Email da duoc dang ky.', 1;
    IF @Purpose = 'Reset' AND NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = @Email)
        THROW 50002, 'Email chua duoc dang ky.', 1;

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
        THROW 50003, 'Ma OTP khong hop le hoac da het han.', 1;
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
        THROW 50003, 'Ma OTP khong hop le hoac da het han.', 1;
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
    UPDATE dbo.Users
    SET FullName = @FullName,
        Avatar = COALESCE(@Avatar, Avatar)
    WHERE UserID = @UserID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Auth_ChangePassword
    @UserID INT,
    @NewPasswordHash VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Users SET Password = @NewPasswordHash WHERE UserID = @UserID;
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
    BEGIN TRANSACTION;

    UPDATE dbo.Users SET Status = @Status WHERE UserID = @UserID;

    IF @Status = 'Locked'
        UPDATE dbo.Sessions SET RevokedAt = SYSUTCDATETIME()
        WHERE UserID = @UserID AND RevokedAt IS NULL;

    INSERT dbo.AuditLog (ActorID, Action, TargetType, TargetID, Detail)
    VALUES (@ActorID, 'SetUserStatus', 'User', @UserID, @Status);

    COMMIT TRANSACTION;
END
GO

-- Admin co the mo phong bat ky User nao; Teacher chi mo phong hoc vien dang trong lop minh day.
CREATE OR ALTER PROCEDURE app.usp_Admin_ValidateImpersonate
    @ActorID INT,
    @TargetUserID INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ActorRole VARCHAR(20) = (SELECT Role FROM dbo.Users WHERE UserID = @ActorID);
    DECLARE @TargetRole VARCHAR(20) = (SELECT Role FROM dbo.Users WHERE UserID = @TargetUserID);
    DECLARE @Allowed BIT = 0;

    IF @TargetRole = 'User'
    BEGIN
        IF @ActorRole = 'Admin'
            SET @Allowed = 1;
        ELSE IF @ActorRole = 'Teacher' AND EXISTS (
            SELECT 1 FROM dbo.Class_Student cs
            JOIN dbo.Classes c ON c.ClassID = cs.ClassID
            WHERE c.TeacherID = @ActorID AND cs.UserID = @TargetUserID
        )
            SET @Allowed = 1;
    END

    IF @Allowed = 1
        INSERT dbo.AuditLog (ActorID, Action, TargetType, TargetID)
        VALUES (@ActorID, 'ImpersonateStart', 'User', @TargetUserID);

    SELECT @Allowed AS Allowed;
END
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
            THROW 50001, 'Email da duoc dang ky.', 1;
        END;

        IF EXISTS (SELECT 1 FROM dbo.Users WHERE Username = @Username)
        BEGIN
            THROW 50004, 'Ten dang nhap da duoc su dung.', 1;
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

