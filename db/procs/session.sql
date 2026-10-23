CREATE OR ALTER PROCEDURE app.usp_Session_Create
    @UserID INT,
    @ActorID INT = NULL,
    @ExpiresAt DATETIME2(0)
AS
BEGIN
    SET NOCOUNT ON;
    IF @ActorID IS NOT NULL
        THROW 50035, N'Chức năng mô phỏng người dùng đã bị loại bỏ.', 1;

    DECLARE @SessionID UNIQUEIDENTIFIER = NEWID();
    INSERT dbo.Sessions (SessionID, UserID, ExpiresAt)
    VALUES (@SessionID, @UserID, @ExpiresAt);
    SELECT @SessionID AS SessionID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Session_Validate
    @SessionID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT u.UserID, u.Role, u.FullName, u.Status, u.Avatar
    FROM dbo.Sessions s
    JOIN dbo.Users u ON u.UserID = s.UserID
    WHERE s.SessionID = @SessionID
      AND s.RevokedAt IS NULL
      AND s.ExpiresAt > SYSUTCDATETIME();
END
GO

CREATE OR ALTER PROCEDURE app.usp_Session_Revoke
    @SessionID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Sessions SET RevokedAt = SYSUTCDATETIME()
    WHERE SessionID = @SessionID AND RevokedAt IS NULL;
END
GO

