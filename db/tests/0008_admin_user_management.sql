DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

-- Clean up any prior test artifacts
DELETE FROM dbo.Sessions WHERE UserID IN (SELECT UserID FROM dbo.Users WHERE Username IN ('admin_test_mgt', 'user_test_mgt'));
DELETE FROM dbo.AuditLog WHERE TargetID IN (SELECT UserID FROM dbo.Users WHERE Username IN ('admin_test_mgt', 'user_test_mgt'));
DELETE FROM dbo.Users WHERE Username IN ('admin_test_mgt', 'user_test_mgt');

-- Create test admin and test user
INSERT INTO dbo.Users (Username, Password, Email, FullName, Role, Status)
VALUES ('admin_test_mgt', 'hash', 'admin_mgt@test.com', N'Admin Test', 'Admin', 'Active');
DECLARE @AdminID INT = SCOPE_IDENTITY();

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role, Status)
VALUES ('user_test_mgt', 'hash', 'user_mgt@test.com', N'User Test', 'User', 'Active');
DECLARE @UserID INT = SCOPE_IDENTITY();

-- Create a session for User
INSERT INTO dbo.Sessions (UserID, ExpiresAt)
VALUES (@UserID, DATEADD(DAY, 1, SYSUTCDATETIME()));

-- 1. Non-admin cannot list users
BEGIN TRY
    EXEC app.usp_Admin_ListUsers @ActorID = @UserID;
    INSERT @Results SELECT 'non-admin cannot list users', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'non-admin cannot list users', 1;
END CATCH;

-- 2. Admin can list users
DECLARE @ListTable TABLE (
    UserID INT,
    Username VARCHAR(50),
    Email VARCHAR(100),
    FullName NVARCHAR(100),
    Role VARCHAR(20),
    Status VARCHAR(20),
    Avatar VARCHAR(255),
    CreatedAt DATETIME2(0),
    TotalCount INT
);

INSERT INTO @ListTable
EXEC app.usp_Admin_ListUsers @ActorID = @AdminID, @Search = 'user_mgt';

INSERT @Results SELECT 'admin can search users by keyword',
    CASE WHEN EXISTS (SELECT 1 FROM @ListTable WHERE UserID = @UserID) THEN 1 ELSE 0 END;

-- 3. Non-admin cannot set user status
BEGIN TRY
    EXEC app.usp_Admin_SetUserStatus @ActorID = @UserID, @UserID = @AdminID, @Status = 'Locked';
    INSERT @Results SELECT 'non-admin cannot set user status', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'non-admin cannot set user status', 1;
END CATCH;

-- 4. Admin cannot lock themselves
BEGIN TRY
    EXEC app.usp_Admin_SetUserStatus @ActorID = @AdminID, @UserID = @AdminID, @Status = 'Locked';
    INSERT @Results SELECT 'admin cannot self-lock', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'admin cannot self-lock', 1;
END CATCH;

-- 5. Admin can lock target user and session is revoked
EXEC app.usp_Admin_SetUserStatus @ActorID = @AdminID, @UserID = @UserID, @Status = 'Locked';

INSERT @Results SELECT 'user is locked',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Status = 'Locked') THEN 1 ELSE 0 END;

INSERT @Results SELECT 'user active sessions are revoked on lock',
    CASE WHEN NOT EXISTS (SELECT 1 FROM dbo.Sessions WHERE UserID = @UserID AND RevokedAt IS NULL) THEN 1 ELSE 0 END;

-- 6. Admin can unlock target user
EXEC app.usp_Admin_SetUserStatus @ActorID = @AdminID, @UserID = @UserID, @Status = 'Active';

INSERT @Results SELECT 'user is unlocked',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Status = 'Active') THEN 1 ELSE 0 END;

-- 7. Non-admin cannot set user role
BEGIN TRY
    EXEC app.usp_Admin_SetUserRole @ActorID = @UserID, @UserID = @AdminID, @Role = 'TA';
    INSERT @Results SELECT 'non-admin cannot set user role', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'non-admin cannot set user role', 1;
END CATCH;

-- 8. Admin cannot self-change role
BEGIN TRY
    EXEC app.usp_Admin_SetUserRole @ActorID = @AdminID, @UserID = @AdminID, @Role = 'TA';
    INSERT @Results SELECT 'admin cannot self-change role', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'admin cannot self-change role', 1;
END CATCH;

-- 9. Cannot set invalid role
BEGIN TRY
    EXEC app.usp_Admin_SetUserRole @ActorID = @AdminID, @UserID = @UserID, @Role = 'SuperAdmin';
    INSERT @Results SELECT 'cannot set invalid role', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'cannot set invalid role', 1;
END CATCH;

-- 10. Admin can upgrade user to TA
EXEC app.usp_Admin_SetUserRole @ActorID = @AdminID, @UserID = @UserID, @Role = 'TA';

INSERT @Results SELECT 'admin can upgrade user to TA',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role = 'TA') THEN 1 ELSE 0 END;

-- 11. Admin can upgrade user to Teacher
EXEC app.usp_Admin_SetUserRole @ActorID = @AdminID, @UserID = @UserID, @Role = 'Teacher';

INSERT @Results SELECT 'admin can upgrade user to Teacher',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role = 'Teacher') THEN 1 ELSE 0 END;

-- 12. Admin can revert role to User
EXEC app.usp_Admin_SetUserRole @ActorID = @AdminID, @UserID = @UserID, @Role = 'User';

INSERT @Results SELECT 'admin can set role back to User',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role = 'User') THEN 1 ELSE 0 END;

-- 13. Audit log recorded role changes
INSERT @Results SELECT 'audit log recorded role change',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.AuditLog WHERE TargetID = @UserID AND Action = 'SetUserRole') THEN 1 ELSE 0 END;

-- Clean up
DELETE FROM dbo.Sessions WHERE UserID IN (@AdminID, @UserID);
DELETE FROM dbo.AuditLog WHERE TargetID IN (@AdminID, @UserID);
DELETE FROM dbo.Users WHERE UserID IN (@AdminID, @UserID);

SELECT Assertion, Passed FROM @Results;
