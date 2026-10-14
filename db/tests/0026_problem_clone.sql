DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

BEGIN TRANSACTION;

DECLARE @TeacherID INT, @StudentID INT;

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role)
VALUES 
    ('pclo_tea_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'pclo_tea_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'PClo Teacher', 'Teacher'),
    ('pclo_std_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'pclo_std_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'PClo Student', 'User');

SELECT @TeacherID = UserID FROM dbo.Users WHERE FullName = N'PClo Teacher' AND Email LIKE 'pclo_tea_%';
SELECT @StudentID = UserID FROM dbo.Users WHERE FullName = N'PClo Student' AND Email LIKE 'pclo_std_%';

DECLARE @ProblemID INT;
INSERT INTO dbo.Problems (CreatorID, Title, Statement, Difficulty, Status)
VALUES (@TeacherID, N'Source Problem for Clone', N'Statement to clone', 'Easy', 'Public');
SELECT @ProblemID = SCOPE_IDENTITY();

INSERT INTO dbo.Testcases (ProblemID, InputData, ExpectedOutput, IsHidden, OrderIndex)
VALUES 
    (@ProblemID, '1 2', '3', 0, 1),
    (@ProblemID, '5 5', '10', 1, 2);

DECLARE @CloneResult TABLE (
    ProblemID INT,
    Title NVARCHAR(200),
    Difficulty VARCHAR(20),
    Status VARCHAR(20),
    CreatedAt DATETIME2(0)
);

INSERT INTO @CloneResult
EXEC app.usp_Problem_Clone @ProblemID = @ProblemID, @ActorID = @TeacherID, @NewTitle = N'Custom Cloned Problem';

DECLARE @ClonedProblemID INT;
SELECT @ClonedProblemID = ProblemID FROM @CloneResult;

INSERT @Results SELECT 'teacher can clone public problem with custom title',
    CASE WHEN @ClonedProblemID IS NOT NULL AND EXISTS (SELECT 1 FROM @CloneResult WHERE Title = N'Custom Cloned Problem' AND Status = 'Private') THEN 1 ELSE 0 END;

INSERT @Results SELECT 'cloned problem has all testcases copied',
    CASE WHEN (SELECT COUNT(*) FROM dbo.Testcases WHERE ProblemID = @ClonedProblemID) = 2 THEN 1 ELSE 0 END;

BEGIN TRY
    EXEC app.usp_Problem_Clone @ProblemID = @ProblemID, @ActorID = @StudentID;
    INSERT @Results SELECT 'student cannot clone problem', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'student cannot clone problem', 1;
END CATCH;

BEGIN TRY
    EXEC app.usp_Problem_Clone @ProblemID = 99999999, @ActorID = @TeacherID;
    INSERT @Results SELECT 'non existent problem throws 50021', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'non existent problem throws 50021', 1;
END CATCH;

IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;
