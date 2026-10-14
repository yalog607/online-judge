DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

BEGIN TRANSACTION;

DECLARE @TeacherID INT, @StudentID1 INT, @StudentID2 INT;

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role)
VALUES 
    ('prep_tea_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'prep_tea_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'PRep Teacher', 'Teacher'),
    ('prep_st1_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'prep_st1_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'PRep Student 1', 'User'),
    ('prep_st2_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'prep_st2_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'PRep Student 2', 'User');

SELECT @TeacherID = UserID FROM dbo.Users WHERE FullName = N'PRep Teacher' AND Email LIKE 'prep_tea_%';
SELECT @StudentID1 = UserID FROM dbo.Users WHERE FullName = N'PRep Student 1' AND Email LIKE 'prep_st1_%';
SELECT @StudentID2 = UserID FROM dbo.Users WHERE FullName = N'PRep Student 2' AND Email LIKE 'prep_st2_%';

DECLARE @ProblemID INT;
INSERT INTO dbo.Problems (CreatorID, Title, Statement, Difficulty, Tags, Status)
VALUES (@TeacherID, N'PRep Sample Problem', N'Solve it', 'Easy', 'Array,Math', 'Public');
SELECT @ProblemID = SCOPE_IDENTITY();

INSERT INTO dbo.Submissions (UserID, ProblemID, SourceCode, Language, Result)
VALUES (@StudentID1, @ProblemID, 'print(1)', 'Python', 'AC');

BEGIN TRY
    EXEC app.usp_Report_GetUserPersonalProgress @TargetUserID = @StudentID1, @ActorID = @StudentID1;
    INSERT @Results SELECT 'student can view their own progress report', 1;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'student can view their own progress report', 0;
END CATCH;

BEGIN TRY
    EXEC app.usp_Report_GetUserPersonalProgress @TargetUserID = @StudentID1, @ActorID = @TeacherID;
    INSERT @Results SELECT 'teacher can view student progress report', 1;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'teacher can view student progress report', 0;
END CATCH;

BEGIN TRY
    EXEC app.usp_Report_GetUserPersonalProgress @TargetUserID = @StudentID1, @ActorID = @StudentID2;
    INSERT @Results SELECT 'other student cannot view progress report', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'other student cannot view progress report', 1;
END CATCH;

BEGIN TRY
    EXEC app.usp_Report_GetUserPersonalProgress @TargetUserID = 99999999, @ActorID = @TeacherID;
    INSERT @Results SELECT 'non existent user throws 50031', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'non existent user throws 50031', 1;
END CATCH;

IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;
