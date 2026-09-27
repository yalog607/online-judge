CREATE OR ALTER PROCEDURE app.usp_Session_Create
    @UserID INT,
    @ActorID INT = NULL,
    @ExpiresAt DATETIME2(0)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @SessionID UNIQUEIDENTIFIER = NEWID();
    INSERT dbo.Sessions (SessionID, UserID, ActorID, ExpiresAt)
    VALUES (@SessionID, @UserID, @ActorID, @ExpiresAt);
    SELECT @SessionID AS SessionID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Session_Validate
    @SessionID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT u.UserID, u.Role, u.FullName, u.Status
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

-- Used on account lock so an admin action ends the session immediately.
CREATE OR ALTER PROCEDURE app.usp_Session_RevokeAllForUser
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Sessions SET RevokedAt = SYSUTCDATETIME()
    WHERE UserID = @UserID AND RevokedAt IS NULL;
END
GO
