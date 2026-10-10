DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

DELETE FROM dbo.Sessions WHERE UserID IN (SELECT UserID FROM dbo.Users WHERE Username IN ('adm_imp_test', 'tch_imp_test', 'std1_imp_test', 'std2_imp_test', 'other_tch_test'));
DELETE FROM dbo.AuditLog WHERE ActorID IN (SELECT UserID FROM dbo.Users WHERE Username IN ('adm_imp_test', 'tch_imp_test'));
DELETE FROM dbo.Class_Student WHERE UserID IN (SELECT UserID FROM dbo.Users WHERE Username IN ('std1_imp_test', 'std2_imp_test'));
DELETE FROM dbo.Classes WHERE ClassName = 'Imp_Test_Class';
DELETE FROM dbo.Users WHERE Username IN ('adm_imp_test', 'tch_imp_test', 'std1_imp_test', 'std2_imp_test', 'other_tch_test');

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role, Status)
VALUES ('adm_imp_test', 'hash', 'adm_imp@test.com', N'Admin Imp', 'Admin', 'Active');
DECLARE @AdminID INT = SCOPE_IDENTITY();

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role, Status)
VALUES ('tch_imp_test', 'hash', 'tch_imp@test.com', N'Teacher Imp', 'Teacher', 'Active');
DECLARE @TeacherID INT = SCOPE_IDENTITY();

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role, Status)
VALUES ('other_tch_test', 'hash', 'other_tch@test.com', N'Other Teacher', 'Teacher', 'Active');
DECLARE @OtherTeacherID INT = SCOPE_IDENTITY();

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role, Status)
VALUES ('std1_imp_test', 'hash', 'std1_imp@test.com', N'Student In Class', 'User', 'Active');
DECLARE @StudentInClassID INT = SCOPE_IDENTITY();

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role, Status)
VALUES ('std2_imp_test', 'hash', 'std2_imp@test.com', N'Student Not In Class', 'User', 'Active');
DECLARE @StudentOutClassID INT = SCOPE_IDENTITY();

INSERT INTO dbo.Classes (ClassName, Description, TeacherID, InviteCode, IsPublic)
VALUES ('Imp_Test_Class', 'Test Description', @TeacherID, 'IMP123', 0);
DECLARE @ClassID INT = SCOPE_IDENTITY();

INSERT INTO dbo.Class_Student (ClassID, UserID)
VALUES (@ClassID, @StudentInClassID);

INSERT @Results SELECT 'admin can impersonate user',
    CASE WHEN app.ufn_CanImpersonateUser(@AdminID, @StudentInClassID) = 1 THEN 1 ELSE 0 END;

INSERT @Results SELECT 'admin can impersonate teacher',
    CASE WHEN app.ufn_CanImpersonateUser(@AdminID, @TeacherID) = 1 THEN 1 ELSE 0 END;

INSERT @Results SELECT 'admin cannot self-impersonate',
    CASE WHEN app.ufn_CanImpersonateUser(@AdminID, @AdminID) = 0 THEN 1 ELSE 0 END;

INSERT @Results SELECT 'teacher can impersonate student in class',
    CASE WHEN app.ufn_CanImpersonateUser(@TeacherID, @StudentInClassID) = 1 THEN 1 ELSE 0 END;

INSERT @Results SELECT 'teacher cannot impersonate student outside class',
    CASE WHEN app.ufn_CanImpersonateUser(@TeacherID, @StudentOutClassID) = 0 THEN 1 ELSE 0 END;

INSERT @Results SELECT 'teacher cannot impersonate admin',
    CASE WHEN app.ufn_CanImpersonateUser(@TeacherID, @AdminID) = 0 THEN 1 ELSE 0 END;

INSERT @Results SELECT 'teacher cannot impersonate another teacher',
    CASE WHEN app.ufn_CanImpersonateUser(@TeacherID, @OtherTeacherID) = 0 THEN 1 ELSE 0 END;

INSERT @Results SELECT 'student cannot impersonate anyone',
    CASE WHEN app.ufn_CanImpersonateUser(@StudentInClassID, @StudentOutClassID) = 0 THEN 1 ELSE 0 END;

DECLARE @OutAllowed BIT;
DECLARE @ProcTable TABLE (Allowed BIT);
INSERT INTO @ProcTable
EXEC app.usp_Admin_ValidateImpersonate @ActorID = @TeacherID, @TargetUserID = @StudentInClassID;
SELECT @OutAllowed = Allowed FROM @ProcTable;

INSERT @Results SELECT 'usp_Admin_ValidateImpersonate succeeds for teacher student',
    CASE WHEN @OutAllowed = 1 THEN 1 ELSE 0 END;

INSERT @Results SELECT 'audit log recorded for impersonation start',
    CASE WHEN EXISTS (
        SELECT 1 FROM dbo.AuditLog 
        WHERE ActorID = @TeacherID 
          AND Action = 'ImpersonateStart' 
          AND TargetID = @StudentInClassID
    ) THEN 1 ELSE 0 END;

DECLARE @TeacherStudentsCount INT;
SELECT @TeacherStudentsCount = COUNT(*) 
FROM app.ufn_GetImpersonatableStudentsForTeacher(@TeacherID, @ClassID);

INSERT @Results SELECT 'ufn_GetImpersonatableStudentsForTeacher returns student in class',
    CASE WHEN @TeacherStudentsCount >= 1 THEN 1 ELSE 0 END;

DECLARE @SessionID UNIQUEIDENTIFIER = NEWID();
INSERT INTO dbo.Sessions (SessionID, UserID, ActorID, ExpiresAt)
VALUES (@SessionID, @StudentInClassID, @TeacherID, DATEADD(HOUR, 2, SYSUTCDATETIME()));

INSERT @Results SELECT 'active impersonations view includes session',
    CASE WHEN EXISTS (
        SELECT 1 FROM app.uvw_ActiveImpersonations 
        WHERE SessionID = @SessionID 
          AND ActorID = @TeacherID 
          AND TargetUserID = @StudentInClassID
    ) THEN 1 ELSE 0 END;

INSERT @Results SELECT 'session audit trigger logged impersonate start',
    CASE WHEN EXISTS (
        SELECT 1 FROM dbo.AuditLog
        WHERE ActorID = @TeacherID
          AND Action = 'IMPERSONATE_SESSION_START'
          AND TargetID = @StudentInClassID
    ) THEN 1 ELSE 0 END;

DELETE FROM dbo.Sessions WHERE SessionID = @SessionID;
DELETE FROM dbo.Class_Student WHERE ClassID = @ClassID;
DELETE FROM dbo.Classes WHERE ClassID = @ClassID;
DELETE FROM dbo.AuditLog WHERE ActorID IN (@AdminID, @TeacherID);
DELETE FROM dbo.Users WHERE UserID IN (@AdminID, @TeacherID, @OtherTeacherID, @StudentInClassID, @StudentOutClassID);

SELECT Assertion, Passed FROM @Results;

IF EXISTS (SELECT 1 FROM @Results WHERE Passed = 0)
    THROW 50000, 'Impersonation tests failed', 1;
