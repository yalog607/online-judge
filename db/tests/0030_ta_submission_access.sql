DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

BEGIN TRANSACTION;

DECLARE @TeacherID INT, @TAID INT, @StudentID INT, @OtherStudentID INT, @ProblemID INT, @SubmissionID INT;

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role)
VALUES 
    ('tc_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'tc_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'Test Teacher', 'Teacher'),
    ('ta_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'ta_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'Test TA', 'TA'),
    ('st_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'st_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'Student One', 'User'),
    ('oth_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'oth_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'Student Two', 'User');

SELECT @TeacherID = UserID FROM dbo.Users WHERE FullName = N'Test Teacher' AND Role = 'Teacher';
SELECT @TAID = UserID FROM dbo.Users WHERE FullName = N'Test TA' AND Role = 'TA';
SELECT @StudentID = UserID FROM dbo.Users WHERE FullName = N'Student One' AND Role = 'User';
SELECT @OtherStudentID = UserID FROM dbo.Users WHERE FullName = N'Student Two' AND Role = 'User';

INSERT INTO dbo.Problems (CreatorID, Title, Statement, Difficulty, Status)
VALUES (@TeacherID, N'Submission Access Problem', N'Statement content', 'Easy', 'Public');
SET @ProblemID = SCOPE_IDENTITY();

INSERT INTO dbo.Submissions (UserID, ProblemID, SourceCode, Language, Result)
VALUES (@StudentID, @ProblemID, N'print("hello")', 'python', 'AC');
SET @SubmissionID = SCOPE_IDENTITY();

BEGIN TRY
    EXEC app.usp_Submission_Get @SubmissionID = @SubmissionID, @RequesterID = @StudentID;
    INSERT @Results SELECT 'owner student can view own submission', 1;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'owner student can view own submission', 0;
END CATCH;

BEGIN TRY
    EXEC app.usp_Submission_Get @SubmissionID = @SubmissionID, @RequesterID = @TAID;
    INSERT @Results SELECT 'ta can view student submission in class', 1;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'ta can view student submission in class', 0;
END CATCH;

BEGIN TRY
    EXEC app.usp_Submission_Get @SubmissionID = @SubmissionID, @RequesterID = @TeacherID;
    INSERT @Results SELECT 'teacher can view student submission', 1;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'teacher can view student submission', 0;
END CATCH;

BEGIN TRY
    EXEC app.usp_Submission_Get @SubmissionID = @SubmissionID, @RequesterID = @OtherStudentID;
    INSERT @Results SELECT 'unauthorized student cannot view other student submission', 0;
END TRY
BEGIN CATCH
    IF ERROR_NUMBER() = 50023
        INSERT @Results SELECT 'unauthorized student cannot view other student submission', 1;
    ELSE
        INSERT @Results SELECT 'unauthorized student cannot view other student submission', 0;
END CATCH;

ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;

IF EXISTS (SELECT 1 FROM @Results WHERE Passed = 0)
    THROW 50000, 'Test failed', 1;
