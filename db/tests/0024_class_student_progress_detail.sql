DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

BEGIN TRANSACTION;

DECLARE @TeacherID INT, @StudentID INT, @StrangerID INT;

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role)
VALUES 
    ('pdet_tea_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'pdet_tea_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'PDet Teacher', 'Teacher'),
    ('pdet_std_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'pdet_std_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'PDet Student', 'User'),
    ('pdet_str_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'pdet_str_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'PDet Stranger', 'User');

SELECT @TeacherID = UserID FROM dbo.Users WHERE FullName = N'PDet Teacher' AND Email LIKE 'pdet_tea_%';
SELECT @StudentID = UserID FROM dbo.Users WHERE FullName = N'PDet Student' AND Email LIKE 'pdet_std_%';
SELECT @StrangerID = UserID FROM dbo.Users WHERE FullName = N'PDet Stranger' AND Email LIKE 'pdet_str_%';

DECLARE @ClassID INT;
INSERT INTO dbo.Classes (TeacherID, InviteCode, ClassName, Description, IsPublic, ApprovalStatus)
VALUES (@TeacherID, 'PDET' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 6), N'Progress Detail Test Class', N'Description', 0, 'Approved');
SELECT @ClassID = SCOPE_IDENTITY();

INSERT INTO dbo.Class_Student (ClassID, UserID, JoinDate, ProgressPercent)
VALUES (@ClassID, @StudentID, SYSUTCDATETIME(), 0.0);

DECLARE @ProblemID1 INT, @ProblemID2 INT;
INSERT INTO dbo.Problems (CreatorID, Title, Statement, Difficulty, Status)
VALUES 
    (@TeacherID, N'Test Problem 1', N'Statement 1', 'Easy', 'Public');
SELECT @ProblemID1 = SCOPE_IDENTITY();

INSERT INTO dbo.Problems (CreatorID, Title, Statement, Difficulty, Status)
VALUES 
    (@TeacherID, N'Test Problem 2', N'Statement 2', 'Medium', 'Public');
SELECT @ProblemID2 = SCOPE_IDENTITY();

INSERT INTO dbo.Class_Problem (ClassID, ProblemID)
VALUES (@ClassID, @ProblemID1), (@ClassID, @ProblemID2);

INSERT INTO dbo.Submissions (UserID, ProblemID, SourceCode, Language, Result)
VALUES (@StudentID, @ProblemID1, 'print(1)', 'Python', 'AC');

INSERT INTO dbo.Submissions (UserID, ProblemID, SourceCode, Language, Result)
VALUES (@StudentID, @ProblemID2, 'print(0)', 'Python', 'WA');

BEGIN TRY
    EXEC app.usp_Class_GetStudentProgressDetail 
        @ClassID = @ClassID, 
        @StudentID = @StudentID, 
        @ActorID = @TeacherID;
    INSERT @Results SELECT 'teacher can execute student progress detail', 1;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'teacher can execute student progress detail', 0;
END CATCH;

INSERT @Results SELECT 'calculated progress percent updated to 50 percent',
    CASE WHEN EXISTS (
        SELECT 1 FROM dbo.Class_Student
        WHERE ClassID = @ClassID AND UserID = @StudentID AND ProgressPercent = 50.0
    ) THEN 1 ELSE 0 END;

BEGIN TRY
    EXEC app.usp_Class_GetStudentProgressDetail 
        @ClassID = @ClassID, 
        @StudentID = @StudentID, 
        @ActorID = @StudentID;
    INSERT @Results SELECT 'student can view their own progress detail', 1;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'student can view their own progress detail', 0;
END CATCH;

BEGIN TRY
    EXEC app.usp_Class_GetStudentProgressDetail 
        @ClassID = @ClassID, 
        @StudentID = @StudentID, 
        @ActorID = @StrangerID;
    INSERT @Results SELECT 'stranger cannot view progress detail', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'stranger cannot view progress detail', 1;
END CATCH;

BEGIN TRY
    EXEC app.usp_Class_GetStudentProgressDetail 
        @ClassID = @ClassID, 
        @StudentID = @StrangerID, 
        @ActorID = @TeacherID;
    INSERT @Results SELECT 'unenrolled student throws 50032', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'unenrolled student throws 50032', 1;
END CATCH;

IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;
