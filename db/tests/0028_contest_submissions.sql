DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

BEGIN TRANSACTION;

DECLARE @TeacherID INT, @StudentID1 INT, @StudentID2 INT, @OtherUserID INT;

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role)
VALUES 
    ('csub_tea_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'csub_tea_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'CSub Teacher', 'Teacher'),
    ('csub_std1_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'csub_std1_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'CSub Student 1', 'User'),
    ('csub_std2_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'csub_std2_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'CSub Student 2', 'User'),
    ('csub_oth_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'csub_oth_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'CSub Other', 'User');

SELECT @TeacherID = UserID FROM dbo.Users WHERE FullName = N'CSub Teacher' AND Email LIKE 'csub_tea_%';
SELECT @StudentID1 = UserID FROM dbo.Users WHERE FullName = N'CSub Student 1' AND Email LIKE 'csub_std1_%';
SELECT @StudentID2 = UserID FROM dbo.Users WHERE FullName = N'CSub Student 2' AND Email LIKE 'csub_std2_%';
SELECT @OtherUserID = UserID FROM dbo.Users WHERE FullName = N'CSub Other' AND Email LIKE 'csub_oth_%';

DECLARE @ProblemID1 INT, @ProblemID2 INT;
INSERT INTO dbo.Problems (CreatorID, Title, Statement, Difficulty, Status)
VALUES 
    (@TeacherID, N'Contest Problem 1', N'Statement 1', 'Easy', 'Public'),
    (@TeacherID, N'Contest Problem 2', N'Statement 2', 'Medium', 'Public');
SELECT @ProblemID1 = ProblemID FROM dbo.Problems WHERE Title = N'Contest Problem 1' AND CreatorID = @TeacherID;
SELECT @ProblemID2 = ProblemID FROM dbo.Problems WHERE Title = N'Contest Problem 2' AND CreatorID = @TeacherID;

DECLARE @ContestID INT;
INSERT INTO dbo.Contests (CreatorID, ContestName, Description, StartTime, EndTime)
VALUES (@TeacherID, N'Test Contest Submissions', N'Desc', DATEADD(HOUR, -1, SYSUTCDATETIME()), DATEADD(HOUR, 2, SYSUTCDATETIME()));
SET @ContestID = SCOPE_IDENTITY();

INSERT INTO dbo.Submissions (UserID, ProblemID, ContestID, SourceCode, Language, Result, Runtime, Memory, PassedCases)
VALUES 
    (@StudentID1, @ProblemID1, @ContestID, 'int main(){}', 'cpp', 'AC', 50, 10, 5),
    (@StudentID1, @ProblemID2, @ContestID, 'int main(){}', 'cpp', 'WA', 40, 10, 2),
    (@StudentID2, @ProblemID1, @ContestID, 'def solve(): pass', 'python', 'AC', 60, 20, 5);

BEGIN TRY
    EXEC app.usp_Contest_GetSubmissions @ContestID = @ContestID, @ActorID = @TeacherID;
    INSERT @Results SELECT 'creator can view contest submissions', 1;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'creator can view contest submissions', 0;
END CATCH;

BEGIN TRY
    EXEC app.usp_Contest_GetSubmissions @ContestID = @ContestID, @ActorID = @TeacherID, @ProblemID = @ProblemID1, @Result = 'AC';
    INSERT @Results SELECT 'creator can filter contest submissions by problem and result', 1;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'creator can filter contest submissions by problem and result', 0;
END CATCH;

BEGIN TRY
    EXEC app.usp_Contest_GetSubmissions @ContestID = @ContestID, @ActorID = @OtherUserID;
    INSERT @Results SELECT 'unauthorized user cannot view contest submissions', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'unauthorized user cannot view contest submissions', 1;
END CATCH;

DECLARE @ClassID INT;
INSERT INTO dbo.Classes (TeacherID, InviteCode, ClassName, Description, IsPublic, ApprovalStatus)
VALUES (@TeacherID, 'CSUB' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 6), N'Test Class Submissions', N'Desc', 1, 'Approved');
SET @ClassID = SCOPE_IDENTITY();

INSERT INTO dbo.Class_Student (ClassID, UserID) VALUES (@ClassID, @StudentID1);

BEGIN TRY
    EXEC app.usp_Class_GetSubmissions @ClassID = @ClassID, @ActorID = @TeacherID, @ProblemID = @ProblemID1, @Result = 'AC';
    INSERT @Results SELECT 'teacher can filter class submissions by problem and result', 1;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'teacher can filter class submissions by problem and result', 0;
END CATCH;

ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;
