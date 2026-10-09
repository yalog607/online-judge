DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @Created TABLE (UserID INT);

BEGIN TRANSACTION;

INSERT @Created EXEC app.usp_Auth_RegisterDirect 'rd_user', 'rd_user@test.com', 'x', N'RD User';
INSERT @Results SELECT 'direct registration always creates a User',
    CASE WHEN EXISTS (
        SELECT 1 FROM dbo.Users u JOIN @Created c ON c.UserID = u.UserID WHERE u.Role = 'User' AND u.Status = 'Active'
    ) THEN 1 ELSE 0 END;

BEGIN TRY
    EXEC app.usp_Auth_RegisterDirect @Username = 'rd_admin', @Email = 'rd_admin@test.com',
        @PasswordHash = 'x', @FullName = N'RD Admin', @Role = 'Admin';
    INSERT @Results SELECT 'direct registration rejects a role argument', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'direct registration rejects a role argument', 1;
END CATCH;

INSERT @Results SELECT 'no non-User account was created by direct registration',
    CASE WHEN NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = 'rd_admin@test.com') THEN 1 ELSE 0 END;

IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;
