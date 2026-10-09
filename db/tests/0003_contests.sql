DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

DECLARE @TeacherID INT;
DECLARE @UserID INT;
DECLARE @ProblemID INT;
DECLARE @ContestID INT;

SELECT TOP 1 @TeacherID = UserID FROM dbo.Users WHERE Role IN ('Teacher', 'Admin');

IF @TeacherID IS NULL
BEGIN
    INSERT dbo.Users (Username, Password, Email, FullName, Role)
    VALUES ('contest_teacher', 'x', 'contest_teacher@test.com', N'Contest Teacher', 'Teacher');
    SET @TeacherID = SCOPE_IDENTITY();
END;

SELECT TOP 1 @UserID = UserID FROM dbo.Users WHERE Role = 'User';

IF @UserID IS NULL
BEGIN
    INSERT dbo.Users (Username, Password, Email, FullName, Role)
    VALUES ('contest_student', 'x', 'contest_student@test.com', N'Contest Student', 'User');
    SET @UserID = SCOPE_IDENTITY();
END;

SELECT TOP 1 @ProblemID = ProblemID FROM dbo.Problems;

IF @ProblemID IS NULL
BEGIN
    INSERT dbo.Problems (CreatorID, Title, Statement, Difficulty)
    VALUES (@TeacherID, N'Sample Contest Problem', N'Solve this', 'Easy');
    SET @ProblemID = SCOPE_IDENTITY();
END;

DECLARE @Start DATETIME2(0) = DATEADD(HOUR, -1, SYSUTCDATETIME());
DECLARE @End DATETIME2(0) = DATEADD(HOUR, 2, SYSUTCDATETIME());

BEGIN TRY
    INSERT dbo.Contests (CreatorID, ContestName, StartTime, EndTime)
    VALUES (@TeacherID, '   ', @Start, @End);
    INSERT @Results VALUES ('CK_Contests_Name blocks empty contest name', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('CK_Contests_Name blocks empty contest name', 1);
END CATCH;

BEGIN TRY
    INSERT dbo.Contests (CreatorID, ContestName, StartTime, EndTime)
    VALUES (@TeacherID, N'Invalid Time Contest', @End, @Start);
    INSERT @Results VALUES ('CK_Contests_Time blocks EndTime <= StartTime', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('CK_Contests_Time blocks EndTime <= StartTime', 1);
END CATCH;

BEGIN TRY
    DECLARE @OutTable TABLE (ID INT);
    INSERT INTO @OutTable
    EXEC app.usp_Contest_Create
        @CreatorID = @TeacherID,
        @ContestName = N'Unit Test Contest',
        @Description = N'Testing contests',
        @StartTime = @Start,
        @EndTime = @End,
        @Password = 'secret123';

    SELECT TOP 1 @ContestID = ID FROM @OutTable;
    INSERT @Results VALUES ('app.usp_Contest_Create executes successfully', 1);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('app.usp_Contest_Create executes successfully', 0);
END CATCH;

IF EXISTS (
    SELECT 1 
    FROM dbo.AuditLog 
    WHERE TargetType = 'Contest' AND TargetID = @ContestID AND Action = 'CONTEST_CREATE'
)
BEGIN
    INSERT @Results VALUES ('trg_Contests_AuditLog logs contest creation', 1);
END
ELSE
BEGIN
    INSERT @Results VALUES ('trg_Contests_AuditLog logs contest creation', 0);
END;

IF app.ufn_GetContestStatus(@Start, @End) = 'Ongoing'
BEGIN
    INSERT @Results VALUES ('ufn_GetContestStatus returns Ongoing for active interval', 1);
END
ELSE
BEGIN
    INSERT @Results VALUES ('ufn_GetContestStatus returns Ongoing for active interval', 0);
END;

BEGIN TRY
    EXEC app.usp_Contest_AddProblem
        @ContestID = @ContestID,
        @ProblemID = @ProblemID,
        @RequesterID = @TeacherID,
        @MaxScore = 100,
        @OrderIndex = 1;
    INSERT @Results VALUES ('app.usp_Contest_AddProblem attaches problem', 1);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('app.usp_Contest_AddProblem attaches problem', 0);
END CATCH;

BEGIN TRY
    EXEC app.usp_Contest_Join
        @ContestID = @ContestID,
        @UserID = @UserID,
        @Password = 'wrongpass';
    INSERT @Results VALUES ('app.usp_Contest_Join blocks invalid password', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('app.usp_Contest_Join blocks invalid password', 1);
END CATCH;

BEGIN TRY
    EXEC app.usp_Contest_Join
        @ContestID = @ContestID,
        @UserID = @UserID,
        @Password = 'secret123';
    INSERT @Results VALUES ('app.usp_Contest_Join succeeds with valid password', 1);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('app.usp_Contest_Join succeeds with valid password', 0);
END CATCH;

IF EXISTS (
    SELECT 1 
    FROM app.ufn_GetContestLeaderboard(@ContestID) 
    WHERE UserID = @UserID
)
BEGIN
    INSERT @Results VALUES ('ufn_GetContestLeaderboard lists joined student', 1);
END
ELSE
BEGIN
    INSERT @Results VALUES ('ufn_GetContestLeaderboard lists joined student', 0);
END;

-- Test
UPDATE dbo.Contests 
SET StartTime = DATEADD(HOUR, -3, SYSUTCDATETIME()), 
    EndTime = DATEADD(HOUR, -1, SYSUTCDATETIME()) 
WHERE ContestID = @ContestID;

BEGIN TRY
    DECLARE @OtherStudent INT;
    SELECT TOP 1 @OtherStudent = UserID FROM dbo.Users WHERE Role = 'User' AND UserID <> @UserID;
    IF @OtherStudent IS NULL
    BEGIN
        INSERT dbo.Users (Username, Password, Email, FullName, Role)
        VALUES ('late_student', 'x', 'late_student@test.com', N'Late Student', 'User');
        SET @OtherStudent = SCOPE_IDENTITY();
    END;

    EXEC app.usp_Contest_Join
        @ContestID = @ContestID,
        @UserID = @OtherStudent,
        @Password = 'secret123';
    INSERT @Results VALUES ('app.usp_Contest_Join blocks ended contest', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('app.usp_Contest_Join blocks ended contest', 1);
END CATCH;

BEGIN TRY
    EXEC app.usp_Submission_Create
        @UserID = @UserID,
        @ProblemID = @ProblemID,
        @SourceCode = 'print(1)',
        @Language = 'python',
        @ContestID = @ContestID;
    INSERT @Results VALUES ('app.usp_Submission_Create blocks ended contest', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('app.usp_Submission_Create blocks ended contest', 1);
END CATCH;

IF @ContestID IS NOT NULL
BEGIN
    DELETE FROM dbo.Contests WHERE ContestID = @ContestID;
END;

SELECT Assertion, Passed FROM @Results;
