DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @Sfx VARCHAR(8) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @AdminID INT, @UserID INT;
DECLARE @Rows TABLE (AuditID BIGINT, Action VARCHAR(50), TargetType VARCHAR(30), TargetID INT NULL, Detail NVARCHAR(500) NULL,
                     CreatedAt DATETIME2(0), ActorName NVARCHAR(200), TargetName NVARCHAR(200) NULL, TotalCount INT);

INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('au_a_' + @Sfx, 'hash', 'au_a_' + @Sfx + '@test.com', N'AU Admin', 'Admin');
SET @AdminID = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('au_u_' + @Sfx, 'hash', 'au_u_' + @Sfx + '@test.com', N'AU User', 'User');
SET @UserID = SCOPE_IDENTITY();
INSERT dbo.AuditLog (ActorID, Action, TargetType, TargetID, Detail) VALUES (@AdminID, 'SetUserRole', 'User', @UserID, 'Teacher');

BEGIN TRY
    INSERT @Rows EXEC app.usp_Admin_ListAudit @ActorID = @UserID, @Page = 1, @PageSize = 5;
    INSERT @Results VALUES ('Non-admin cannot list the audit log', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Non-admin cannot list the audit log', CASE WHEN ERROR_NUMBER() = 50031 THEN 1 ELSE 0 END);
END CATCH;

INSERT @Rows EXEC app.usp_Admin_ListAudit @ActorID = @AdminID, @Page = 1, @PageSize = 5;
INSERT @Results VALUES ('Admin gets a page of audit rows, newest first, with a total',
    CASE WHEN (SELECT COUNT(*) FROM @Rows) BETWEEN 1 AND 5
          AND (SELECT TOP 1 TargetID FROM @Rows ORDER BY AuditID DESC) = @UserID
          AND (SELECT MAX(TotalCount) FROM @Rows) >= 1 THEN 1 ELSE 0 END);

DELETE FROM dbo.AuditLog WHERE ActorID = @AdminID;
DELETE FROM dbo.Users WHERE UserID IN (@AdminID, @UserID);
SELECT Assertion, Passed FROM @Results;
