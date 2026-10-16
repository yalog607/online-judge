DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

BEGIN TRANSACTION;

DECLARE @TeacherID INT, @OtherTeacherID INT, @Student1ID INT, @Student2ID INT;
DECLARE @ClassPublicID INT, @ClassApprovalID INT;

DECLARE @TUser VARCHAR(50) = 'tc_cjr_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @OTUser VARCHAR(50) = 'otc_cjr_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @S1User VARCHAR(50) = 'st1_cjr_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @S2User VARCHAR(50) = 'st2_cjr_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role)
VALUES 
    (@TUser, 'hash', @TUser + '@test.com', N'Class Teacher', 'Teacher'),
    (@OTUser, 'hash', @OTUser + '@test.com', N'Other Teacher', 'Teacher'),
    (@S1User, 'hash', @S1User + '@test.com', N'Student 1', 'User'),
    (@S2User, 'hash', @S2User + '@test.com', N'Student 2', 'User');

SELECT @TeacherID = UserID FROM dbo.Users WHERE Username = @TUser;
SELECT @OtherTeacherID = UserID FROM dbo.Users WHERE Username = @OTUser;
SELECT @Student1ID = UserID FROM dbo.Users WHERE Username = @S1User;
SELECT @Student2ID = UserID FROM dbo.Users WHERE Username = @S2User;

DECLARE @PubCode VARCHAR(20) = 'PUB' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @ApprCode VARCHAR(20) = 'APR' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);

INSERT INTO dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@TeacherID, @PubCode, N'Public Class', 1, 'Approved');
SET @ClassPublicID = SCOPE_IDENTITY();

INSERT INTO dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@TeacherID, @ApprCode, N'Approval Required Class', 0, 'Approved');
SET @ClassApprovalID = SCOPE_IDENTITY();

EXEC app.usp_Class_RequestJoin @UserID = @Student1ID, @ClassID = @ClassPublicID, @Message = N'';

IF EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @ClassPublicID AND UserID = @Student1ID)
    INSERT @Results SELECT 'student joining public class directly becomes member', 1;
ELSE
    INSERT @Results SELECT 'student joining public class directly becomes member', 0;

BEGIN TRY
    EXEC app.usp_Class_RequestJoin @UserID = @Student1ID, @ClassID = @ClassApprovalID, @Message = N'   ';
    INSERT @Results SELECT 'empty message rejected for approval required class', 0;
END TRY
BEGIN CATCH
    IF ERROR_NUMBER() = 50024
        INSERT @Results SELECT 'empty message rejected for approval required class', 1;
    ELSE
        INSERT @Results SELECT 'empty message rejected for approval required class', 0;
END CATCH;

EXEC app.usp_Class_RequestJoin @UserID = @Student1ID, @ClassID = @ClassApprovalID, @Message = N'Em xin phep tham gia lop K22';

IF EXISTS (SELECT 1 FROM dbo.Class_JoinRequests WHERE ClassID = @ClassApprovalID AND UserID = @Student1ID AND Status = 'Pending')
    INSERT @Results SELECT 'student submitting join request creates pending record', 1;
ELSE
    INSERT @Results SELECT 'student submitting join request creates pending record', 0;

EXEC app.usp_Class_RequestJoin @UserID = @Student2ID, @ClassID = @ClassApprovalID, @Message = N'Em xin vao lop hoc';

IF (SELECT COUNT(*) FROM dbo.Class_JoinRequests WHERE ClassID = @ClassApprovalID AND Status = 'Pending') = 2
    INSERT @Results SELECT 'class has two pending join requests', 1;
ELSE
    INSERT @Results SELECT 'class has two pending join requests', 0;

BEGIN TRY
    EXEC app.usp_Class_ListJoinRequests @ClassID = @ClassApprovalID, @ActorID = @OtherTeacherID;
    INSERT @Results SELECT 'unauthorized teacher blocked from listing join requests', 0;
END TRY
BEGIN CATCH
    IF ERROR_NUMBER() = 50026
        INSERT @Results SELECT 'unauthorized teacher blocked from listing join requests', 1;
    ELSE
        INSERT @Results SELECT 'unauthorized teacher blocked from listing join requests', 0;
END CATCH;

DECLARE @Req1ID INT = (SELECT RequestID FROM dbo.Class_JoinRequests WHERE ClassID = @ClassApprovalID AND UserID = @Student1ID);
DECLARE @Req2ID INT = (SELECT RequestID FROM dbo.Class_JoinRequests WHERE ClassID = @ClassApprovalID AND UserID = @Student2ID);

EXEC app.usp_Class_ReviewJoinRequest @RequestID = @Req1ID, @ActorID = @TeacherID, @Action = 'Approve';

IF EXISTS (SELECT 1 FROM dbo.Class_JoinRequests WHERE RequestID = @Req1ID AND Status = 'Approved' AND ReviewedBy = @TeacherID)
   AND EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @ClassApprovalID AND UserID = @Student1ID)
    INSERT @Results SELECT 'approving join request adds student to class', 1;
ELSE
    INSERT @Results SELECT 'approving join request adds student to class', 0;

EXEC app.usp_Class_ReviewJoinRequest @RequestID = @Req2ID, @ActorID = @TeacherID, @Action = 'Reject';

IF EXISTS (SELECT 1 FROM dbo.Class_JoinRequests WHERE RequestID = @Req2ID AND Status = 'Rejected' AND ReviewedBy = @TeacherID)
   AND NOT EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @ClassApprovalID AND UserID = @Student2ID)
    INSERT @Results SELECT 'rejecting join request does not add student to class', 1;
ELSE
    INSERT @Results SELECT 'rejecting join request does not add student to class', 0;

BEGIN TRY
    EXEC app.usp_Class_ReviewJoinRequest @RequestID = @Req1ID, @ActorID = @TeacherID, @Action = 'Approve';
    INSERT @Results SELECT 'already processed request cannot be reviewed again', 0;
END TRY
BEGIN CATCH
    IF ERROR_NUMBER() = 50028
        INSERT @Results SELECT 'already processed request cannot be reviewed again', 1;
    ELSE
        INSERT @Results SELECT 'already processed request cannot be reviewed again', 0;
END CATCH;

ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;

IF EXISTS (SELECT 1 FROM @Results WHERE Passed = 0)
    THROW 50000, 'Test failed', 1;