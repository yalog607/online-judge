DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @OwnerID INT, @OtherTeacherID INT, @ContestID INT, @ProblemID INT;
DECLARE @StartTime DATETIME2(0), @EndTime DATETIME2(0), @SubmissionID INT;
DECLARE @Suffix VARCHAR(12) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 12);
DECLARE @Submission TABLE (SubmissionID INT);

INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES
 ('contest_owner_' + @Suffix, 'hash', 'contest_owner_' + @Suffix + '@test.com', N'Contest Owner', 'Teacher'),
 ('contest_other_' + @Suffix, 'hash', 'contest_other_' + @Suffix + '@test.com', N'Other Teacher', 'Teacher');
SELECT @OwnerID = MAX(CASE WHEN Username = 'contest_owner_' + @Suffix THEN UserID END),
       @OtherTeacherID = MAX(CASE WHEN Username = 'contest_other_' + @Suffix THEN UserID END)
FROM dbo.Users;

SELECT TOP 1 @ProblemID = ProblemID FROM dbo.Problems WHERE Status = 'Public';
IF @ProblemID IS NULL
BEGIN
    INSERT dbo.Problems (CreatorID, Title, Statement, Difficulty, Status)
    VALUES (@OwnerID, N'Contest security test ' + @Suffix, N'Test', 'Easy', 'Public');
    SET @ProblemID = SCOPE_IDENTITY();
END;

INSERT dbo.Contests (CreatorID, ContestName, StartTime, EndTime)
VALUES (@OwnerID, N'Contest security test ' + @Suffix, DATEADD(DAY, 1, SYSUTCDATETIME()), DATEADD(DAY, 2, SYSUTCDATETIME()));
SET @ContestID = SCOPE_IDENTITY();
EXEC app.usp_Contest_AddProblem @ContestID, @ProblemID, @OwnerID, 100, 1;

INSERT @Results
SELECT 'Contest overview exposes creator name', CASE WHEN CreatorName = N'Contest Owner' THEN 1 ELSE 0 END
FROM app.uvw_ContestOverview WHERE ContestID = @ContestID;

BEGIN TRY
    EXEC app.usp_Contest_ListProblems @ContestID, @OtherTeacherID;
    INSERT @Results VALUES ('Nonparticipant cannot read upcoming contest problems', 0);
END TRY BEGIN CATCH
    INSERT @Results VALUES ('Nonparticipant cannot read upcoming contest problems', CASE WHEN ERROR_NUMBER() = 50039 THEN 1 ELSE 0 END);
END CATCH;

BEGIN TRY
    EXEC app.usp_Contest_Join @ContestID, @OtherTeacherID, NULL;
    INSERT @Results VALUES ('A different teacher can join as a contestant', CASE WHEN EXISTS (SELECT 1 FROM dbo.Contest_User WHERE ContestID = @ContestID AND UserID = @OtherTeacherID) THEN 1 ELSE 0 END);
END TRY BEGIN CATCH
    INSERT @Results VALUES ('A different teacher can join as a contestant', 0);
END CATCH;

BEGIN TRY
    EXEC app.usp_Contest_ListProblems @ContestID, @OtherTeacherID;
    INSERT @Results VALUES ('Joined teacher still cannot read upcoming problems', 0);
END TRY BEGIN CATCH
    INSERT @Results VALUES ('Joined teacher still cannot read upcoming problems', CASE WHEN ERROR_NUMBER() = 50039 THEN 1 ELSE 0 END);
END CATCH;

BEGIN TRY
    SET @StartTime = DATEADD(DAY, 1, SYSUTCDATETIME());
    SET @EndTime = DATEADD(DAY, 2, SYSUTCDATETIME());
    EXEC app.usp_Contest_Update @ContestID, @OtherTeacherID, N'Unauthorized update', NULL,
        @StartTime, @EndTime, NULL, NULL;
    INSERT @Results VALUES ('Other teacher cannot update contest', 0);
END TRY BEGIN CATCH
    INSERT @Results VALUES ('Other teacher cannot update contest', CASE WHEN ERROR_NUMBER() = 50033 THEN 1 ELSE 0 END);
END CATCH;

BEGIN TRY
    EXEC app.usp_Contest_AddProblem @ContestID, @ProblemID, @OtherTeacherID, 100, 1;
    INSERT @Results VALUES ('Other teacher cannot manage contest problems', 0);
END TRY BEGIN CATCH
    INSERT @Results VALUES ('Other teacher cannot manage contest problems', CASE WHEN ERROR_NUMBER() = 50035 THEN 1 ELSE 0 END);
END CATCH;

BEGIN TRY
    EXEC app.usp_Contest_RemoveProblem @ContestID, @ProblemID, @OtherTeacherID;
    INSERT @Results VALUES ('Other teacher cannot remove contest problems', 0);
END TRY BEGIN CATCH
    INSERT @Results VALUES ('Other teacher cannot remove contest problems', CASE WHEN ERROR_NUMBER() = 50037 THEN 1 ELSE 0 END);
END CATCH;

BEGIN TRY
    EXEC app.usp_Contest_StartNow @ContestID, @OtherTeacherID, 60;
    INSERT @Results VALUES ('Other teacher cannot start contest', 0);
END TRY BEGIN CATCH
    INSERT @Results VALUES ('Other teacher cannot start contest', CASE WHEN ERROR_NUMBER() = 50033 THEN 1 ELSE 0 END);
END CATCH;

BEGIN TRY
    EXEC app.usp_Contest_Delete @ContestID, @OtherTeacherID;
    INSERT @Results VALUES ('Other teacher cannot delete contest', 0);
END TRY BEGIN CATCH
    INSERT @Results VALUES ('Other teacher cannot delete contest', CASE WHEN ERROR_NUMBER() = 50033 THEN 1 ELSE 0 END);
END CATCH;

UPDATE dbo.Contests SET StartTime = DATEADD(MINUTE, -5, SYSUTCDATETIME()), EndTime = DATEADD(HOUR, 1, SYSUTCDATETIME())
WHERE ContestID = @ContestID;
BEGIN TRANSACTION;
INSERT @Submission EXEC app.usp_Submission_Create
    @UserID = @OtherTeacherID,
    @ProblemID = @ProblemID,
    @SourceCode = N'print(1)',
    @Language = 'python',
    @ContestID = @ContestID;
SELECT @SubmissionID = SubmissionID FROM @Submission;
INSERT @Results VALUES ('Joined teacher can submit a contest solution', CASE WHEN @SubmissionID IS NOT NULL THEN 1 ELSE 0 END);
ROLLBACK TRANSACTION;

EXEC app.usp_Contest_Delete @ContestID, @OwnerID;
DELETE dbo.Users WHERE UserID IN (@OwnerID, @OtherTeacherID);
SELECT Assertion, Passed FROM @Results;
