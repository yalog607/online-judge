DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

INSERT @Results VALUES (
    'Sessions no longer stores an impersonation actor',
    CASE WHEN COL_LENGTH('dbo.Sessions', 'ActorID') IS NULL THEN 1 ELSE 0 END
);

INSERT @Results VALUES (
    'Impersonation database objects are absent',
    CASE WHEN OBJECT_ID('app.usp_Admin_ValidateImpersonate') IS NULL
          AND OBJECT_ID('app.ufn_CanImpersonateUser') IS NULL
          AND OBJECT_ID('app.ufn_GetImpersonatableStudentsForTeacher') IS NULL
          AND OBJECT_ID('app.uvw_ActiveImpersonations') IS NULL
          AND OBJECT_ID('dbo.trg_Sessions_AuditImpersonate') IS NULL
         THEN 1 ELSE 0 END
);

DECLARE @Sfx VARCHAR(8) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @UserID INT;
INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES ('no_imp_' + @Sfx, 'hash', 'no_imp_' + @Sfx + '@test.com', N'No Impersonation', 'User');
SET @UserID = SCOPE_IDENTITY();

BEGIN TRY
    EXEC app.usp_Session_Create
        @UserID = @UserID,
        @ActorID = @UserID,
        @ExpiresAt = '2099-01-01';
    INSERT @Results VALUES ('Legacy callers cannot create impersonation sessions', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES (
        'Legacy callers cannot create impersonation sessions',
        CASE WHEN ERROR_NUMBER() = 50035 THEN 1 ELSE 0 END
    );
END CATCH;

DELETE dbo.Sessions WHERE UserID = @UserID;
DELETE dbo.Users WHERE UserID = @UserID;

SELECT Assertion, Passed FROM @Results;
