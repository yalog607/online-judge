DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

BEGIN TRANSACTION;

DECLARE @TeacherID INT, @StudentID1 INT, @StudentID2 INT;

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role)
VALUES 
    ('psub_tea_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'psub_tea_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'PSub Teacher', 'Teacher'),
    ('psub_std1_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'psub_std1_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'PSub Student 1', 'User'),
    ('psub_std2_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'psub_std2_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'PSub Student 2', 'User');

SELECT @TeacherID = UserID FROM dbo.Users WHERE FullName = N'PSub Teacher' AND Email LIKE 'psub_tea_%';
SELECT @StudentID1 = UserID FROM dbo.Users WHERE FullName = N'PSub Student 1' AND Email LIKE 'psub_std1_%';
SELECT @StudentID2 = UserID FROM dbo.Users WHERE FullName = N'PSub Student 2' AND Email LIKE 'psub_std2_%';

DECLARE @ProblemID INT;
INSERT INTO dbo.Problems (CreatorID, Title, Statement, Difficulty, Status)
VALUES (@TeacherID, N'Problem For Submissions Test', N'Statement test', 'Easy', 'Public');
SELECT @ProblemID = SCOPE_IDENTITY();

INSERT INTO dbo.Submissions (UserID, ProblemID, SourceCode, Language, Result, Runtime, Memory, PassedCases)
VALUES 
    (@StudentID1, @ProblemID, 'int main(){}', 'cpp', 'AC', 50, 10, 5),
    (@StudentID1, @ProblemID, 'int main(){}', 'cpp', 'WA', 40, 10, 2),
    (@StudentID2, @ProblemID, 'def solve(): pass', 'python', 'TLE', 1000, 25, 0);

BEGIN TRY
    EXEC app.usp_Problem_GetSubmissions @ProblemID = @ProblemID, @ActorID = @TeacherID;
    INSERT @Results SELECT 'teacher can view problem submissions list and summary', 1;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'teacher can view problem submissions list and summary', 0;
END CATCH;

BEGIN TRY
    EXEC app.usp_Problem_GetSubmissions @ProblemID = @ProblemID, @ActorID = @TeacherID, @Result = 'AC';
    INSERT @Results SELECT 'teacher can filter submissions by verdict', 1;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'teacher can filter submissions by verdict', 0;
END CATCH;

BEGIN TRY
    EXEC app.usp_Problem_GetSubmissions @ProblemID = @ProblemID, @ActorID = @StudentID1;
    INSERT @Results SELECT 'student cannot view problem submissions list', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'student cannot view problem submissions list', 1;
END CATCH;

BEGIN TRY
    EXEC app.usp_Problem_GetSubmissions @ProblemID = 99999999, @ActorID = @TeacherID;
    INSERT @Results SELECT 'non existent problem throws 50021', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'non existent problem throws 50021', 1;
END CATCH;

ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;
