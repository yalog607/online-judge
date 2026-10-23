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
END;
GO

UPDATE dbo.Sessions
SET RevokedAt = SYSUTCDATETIME()
WHERE ActorID IS NOT NULL AND RevokedAt IS NULL;
GO

DROP TRIGGER IF EXISTS dbo.trg_Sessions_AuditImpersonate;
DROP VIEW IF EXISTS app.uvw_ActiveImpersonations;
DROP PROCEDURE IF EXISTS app.usp_Admin_ValidateImpersonate;
DROP FUNCTION IF EXISTS app.ufn_GetImpersonatableStudentsForTeacher;
DROP FUNCTION IF EXISTS app.ufn_CanImpersonateUser;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Sessions_ActorID' AND object_id = OBJECT_ID('dbo.Sessions'))
    DROP INDEX IX_Sessions_ActorID ON dbo.Sessions;

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Sessions_Actor_Not_Self')
    ALTER TABLE dbo.Sessions DROP CONSTRAINT CK_Sessions_Actor_Not_Self;

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Sessions_Actor')
    ALTER TABLE dbo.Sessions DROP CONSTRAINT FK_Sessions_Actor;

IF COL_LENGTH('dbo.Sessions', 'ActorID') IS NOT NULL
    ALTER TABLE dbo.Sessions DROP COLUMN ActorID;
GO
