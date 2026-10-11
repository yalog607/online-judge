DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

BEGIN TRANSACTION;

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role)
VALUES
    ('cc_owner_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8), 'hash', 'cco_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8) + '@test.com', N'Cancellation Owner', 'Teacher'),
    ('cc_student_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8), 'hash', 'ccs_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8) + '@test.com', N'Cancellation Student', 'User'),
    ('cc_other_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8), 'hash', 'cco2_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8) + '@test.com', N'Other Teacher', 'Teacher');

DECLARE @OwnerID INT = (SELECT TOP (1) UserID FROM dbo.Users WHERE FullName = N'Cancellation Owner' ORDER BY UserID DESC);
DECLARE @StudentID INT = (SELECT TOP (1) UserID FROM dbo.Users WHERE FullName = N'Cancellation Student' ORDER BY UserID DESC);
DECLARE @OtherID INT = (SELECT TOP (1) UserID FROM dbo.Users WHERE FullName = N'Other Teacher' ORDER BY UserID DESC);
DECLARE @InviteCode VARCHAR(20) = 'CC' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);

INSERT INTO dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@OwnerID, @InviteCode, N'Cancellation Test Class', 1, 'Approved');
DECLARE @ClassID INT = SCOPE_IDENTITY();

INSERT INTO dbo.Class_Student (ClassID, UserID) VALUES (@ClassID, @StudentID);
INSERT INTO dbo.Problems (CreatorID, Title, Statement, Difficulty, Status)
VALUES (@OwnerID, N'Cancellation Test Problem', N'Solve it', 'Easy', 'Public');
DECLARE @ProblemID INT = SCOPE_IDENTITY();
INSERT INTO dbo.Class_Problem (ClassID, ProblemID) VALUES (@ClassID, @ProblemID);
INSERT INTO dbo.Submissions (UserID, ProblemID, SourceCode, Language, Result)
VALUES (@StudentID, @ProblemID, N'old source', 'cpp', 'AC');
DECLARE @OldSubmissionID INT = SCOPE_IDENTITY();

BEGIN TRY
    EXEC app.usp_Class_Cancel @ClassID = @ClassID, @TeacherID = @OtherID;
    INSERT @Results VALUES ('only owning teacher can cancel the class', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('only owning teacher can cancel the class', 1);
END CATCH;

EXEC app.usp_Class_Cancel @ClassID = @ClassID, @TeacherID = @OwnerID;
INSERT @Results SELECT 'class is marked cancelled', CASE WHEN EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND IsCancelled = 1) THEN 1 ELSE 0 END;
INSERT @Results SELECT 'existing submission history is preserved', CASE WHEN EXISTS (SELECT 1 FROM dbo.Submissions WHERE SubmissionID = @OldSubmissionID AND Result = 'AC') THEN 1 ELSE 0 END;

DECLARE @ClassProblems TABLE (
    ProblemID INT, Title NVARCHAR(200), Difficulty VARCHAR(20), Status VARCHAR(20),
    TimeLimit INT, MemoryLimit INT, AssignedDate DATETIME2(0), DueDate DATETIME2(0),
    IsClosed BIT, UserStatus VARCHAR(10)
);
INSERT INTO @ClassProblems EXEC app.usp_Class_GetProblems @ClassID = @ClassID, @UserID = @StudentID;
INSERT @Results SELECT 'former student can still read assigned problems', CASE WHEN EXISTS (SELECT 1 FROM @ClassProblems WHERE ProblemID = @ProblemID) THEN 1 ELSE 0 END;

DECLARE @VisibleClasses TABLE (
    ClassID INT, TeacherID INT, TeacherName NVARCHAR(100), TeacherEmail VARCHAR(100), InviteCode VARCHAR(20),
    ClassName NVARCHAR(150), Description NVARCHAR(MAX), IsPublic BIT, ApprovalStatus VARCHAR(20),
    IsCancelled BIT, RejectionReason NVARCHAR(MAX), CreatedAt DATETIME2(0), StudentCount INT,
    IsJoined BIT, IsTA BIT, TotalCount INT
);
INSERT INTO @VisibleClasses
EXEC app.usp_Class_List @UserID = @StudentID, @Search = N'Cancellation Test Class', @OnlyMine = 1, @Page = 1, @PageSize = 20;
INSERT @Results SELECT 'former student still sees the cancelled class in history',
    CASE WHEN EXISTS (SELECT 1 FROM @VisibleClasses WHERE ClassID = @ClassID AND IsCancelled = 1 AND IsJoined = 1) THEN 1 ELSE 0 END;
DELETE FROM @VisibleClasses;
INSERT INTO @VisibleClasses
EXEC app.usp_Class_List @UserID = @OtherID, @Search = N'Cancellation Test Class', @OnlyMine = 0, @Page = 1, @PageSize = 20;
INSERT @Results SELECT 'cancelled class is hidden from nonmembers',
    CASE WHEN NOT EXISTS (SELECT 1 FROM @VisibleClasses WHERE ClassID = @ClassID) THEN 1 ELSE 0 END;

BEGIN TRY
    EXEC app.usp_Submission_Create @UserID = @StudentID, @ProblemID = @ProblemID, @SourceCode = N'new source', @Language = 'cpp';
    INSERT @Results VALUES ('former members cannot submit to cancelled class assignments', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('former members cannot submit to cancelled class assignments', 1);
END CATCH;

BEGIN TRY
    EXEC app.usp_Class_JoinByInviteCode @UserID = @OtherID, @InviteCode = @InviteCode;
    INSERT @Results VALUES ('cancelled class rejects invite-code joins', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('cancelled class rejects invite-code joins', 1);
END CATCH;

BEGIN TRANSACTION;
INSERT INTO dbo.Users (Username, Password, Email, FullName, Role)
VALUES
    ('cc2_owner_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8), 'hash', 'cc2o_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8) + '@test.com', N'Cancellation Owner Two', 'Teacher'),
    ('cc2_student_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8), 'hash', 'cc2s_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8) + '@test.com', N'Cancellation Student Two', 'User');
DECLARE @Owner2ID INT = (SELECT TOP (1) UserID FROM dbo.Users WHERE FullName = N'Cancellation Owner Two' ORDER BY UserID DESC);
DECLARE @Student2ID INT = (SELECT TOP (1) UserID FROM dbo.Users WHERE FullName = N'Cancellation Student Two' ORDER BY UserID DESC);
INSERT INTO dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@Owner2ID, 'CC2' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8), N'Cancellation Test Class Two', 1, 'Approved');
DECLARE @Class2ID INT = SCOPE_IDENTITY();
EXEC app.usp_Class_Cancel @ClassID = @Class2ID, @TeacherID = @Owner2ID;
BEGIN TRY
    EXEC app.usp_Class_JoinPublic @UserID = @Student2ID, @ClassID = @Class2ID;
    INSERT @Results VALUES ('cancelled class rejects public joins', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('cancelled class rejects public joins', 1);
END CATCH;

IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
SELECT Assertion, Passed FROM @Results;
