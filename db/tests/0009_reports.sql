DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

BEGIN TRANSACTION;

-- 1. Create Teacher, Student, Admin
INSERT INTO dbo.Users (Username, Password, Email, FullName, Role, Status)
VALUES ('rep_adm_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'rep_admin@test.com', N'Report Admin', 'Admin', 'Active');
DECLARE @AdminID INT = SCOPE_IDENTITY();

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role, Status)
VALUES ('rep_tch_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'rep_teacher@test.com', N'Report Teacher', 'Teacher', 'Active');
DECLARE @TeacherID INT = SCOPE_IDENTITY();

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role, Status)
VALUES ('rep_stu_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'rep_student@test.com', N'Report Student', 'User', 'Active');
DECLARE @StudentID INT = SCOPE_IDENTITY();

-- Create a problem
DECLARE @ProblemID INT;
SELECT TOP 1 @ProblemID = ProblemID FROM dbo.Problems;
IF @ProblemID IS NULL
BEGIN
    INSERT INTO dbo.Problems (CreatorID, Title, Statement, Difficulty, Status)
    VALUES (@TeacherID, N'Report Sample Problem', N'Solve it', 'Easy', 'Public');
    SET @ProblemID = SCOPE_IDENTITY();
END;

-- 2. Create Class and enroll student
INSERT INTO dbo.Classes (ClassName, TeacherID, Description, InviteCode, ApprovalStatus)
VALUES ('report_test_class', @TeacherID, N'Class for report test', 'REP' + LEFT(CAST(NEWID() AS VARCHAR(36)), 3), 'Approved');
DECLARE @ClassID INT = SCOPE_IDENTITY();

INSERT INTO dbo.Class_Student (ClassID, UserID)
VALUES (@ClassID, @StudentID);

INSERT INTO dbo.Class_Problem (ClassID, ProblemID)
VALUES (@ClassID, @ProblemID);

-- Add submissions for student
INSERT INTO dbo.Submissions (UserID, ProblemID, SourceCode, Language, Result)
VALUES (@StudentID, @ProblemID, 'int main(){}', 'cpp', 'AC');

INSERT INTO dbo.Submissions (UserID, ProblemID, SourceCode, Language, Result)
VALUES (@StudentID, @ProblemID, 'int main(){}', 'cpp', 'WA');

-- 3. Test usp_Report_GetClassStats
BEGIN TRY
    EXEC app.usp_Report_GetClassStats @ActorID = @StudentID, @ClassID = @ClassID;
    INSERT @Results SELECT 'student cannot view class report stats', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'student cannot view class report stats', 1;
END CATCH;

BEGIN TRY
    EXEC app.usp_Report_GetClassStats @ActorID = @AdminID, @ClassID = @ClassID;
    INSERT @Results SELECT 'admin can view class report stats', 1;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'admin can view class report stats', 0;
END CATCH;

-- 4. Create Contest and add user
DECLARE @Start DATETIME2(0) = DATEADD(HOUR, -2, SYSUTCDATETIME());
DECLARE @End DATETIME2(0) = DATEADD(HOUR, 2, SYSUTCDATETIME());

INSERT INTO dbo.Contests (CreatorID, ContestName, StartTime, EndTime)
VALUES (@TeacherID, 'report_test_contest', @Start, @End);
DECLARE @ContestID INT = SCOPE_IDENTITY();

INSERT INTO dbo.Contest_Problem (ContestID, ProblemID, MaxScore, OrderIndex)
VALUES (@ContestID, @ProblemID, 100, 1);

INSERT INTO dbo.Contest_User (ContestID, UserID, TotalScore)
VALUES (@ContestID, @StudentID, 100);

-- Add contest submission
INSERT INTO dbo.Submissions (UserID, ProblemID, ContestID, SourceCode, Language, Result)
VALUES (@StudentID, @ProblemID, @ContestID, 'int main(){}', 'cpp', 'AC');

-- 5. Test usp_Report_GetContestStats
BEGIN TRY
    EXEC app.usp_Report_GetContestStats @ActorID = @StudentID, @ContestID = @ContestID;
    INSERT @Results SELECT 'student cannot view contest report stats', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'student cannot view contest report stats', 1;
END CATCH;

BEGIN TRY
    EXEC app.usp_Report_GetContestStats @ActorID = @AdminID, @ContestID = @ContestID;
    INSERT @Results SELECT 'admin can view contest report stats', 1;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'admin can view contest report stats', 0;
END CATCH;

-- 6. Test usp_Report_ListClasses
DECLARE @ClassList TABLE (ClassID INT, ClassName NVARCHAR(100), TeacherName NVARCHAR(100), ApprovalStatus VARCHAR(20), StudentCount INT, ProblemCount INT);
INSERT INTO @ClassList
EXEC app.usp_Report_ListClasses @ActorID = @AdminID;

INSERT @Results SELECT 'admin can list classes for report',
    CASE WHEN EXISTS (SELECT 1 FROM @ClassList WHERE ClassID = @ClassID) THEN 1 ELSE 0 END;

-- 7. Test usp_Report_ListContests
DECLARE @ContestList TABLE (ContestID INT, ContestName NVARCHAR(100), CreatorName NVARCHAR(100), StartTime DATETIME2(0), EndTime DATETIME2(0), Status VARCHAR(20), ParticipantCount INT, ProblemCount INT);
INSERT INTO @ContestList
EXEC app.usp_Report_ListContests @ActorID = @AdminID;

INSERT @Results SELECT 'admin can list contests for report',
    CASE WHEN EXISTS (SELECT 1 FROM @ContestList WHERE ContestID = @ContestID) THEN 1 ELSE 0 END;

-- Rollback the entire transaction to cleanly undo test data
IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;
