DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @Suffix VARCHAR(12) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 12);
DECLARE @OwnerID INT, @OtherTeacherID INT, @StudentID INT, @ContestID INT;
DECLARE @PublicProblemID INT, @PrivateProblemID INT, @OtherPrivateID INT, @PendingProblemID INT;
DECLARE @Submission TABLE (SubmissionID INT);
DECLARE @JoinedContests TABLE (
    ContestID INT, CreatorID INT, CreatorName NVARCHAR(200), CreatorUsername NVARCHAR(100),
    ContestName NVARCHAR(200), Description NVARCHAR(MAX), StartTime DATETIME2(0), EndTime DATETIME2(0),
    ClassID INT NULL, ClassName NVARCHAR(200) NULL, IsProtected BIT, Status VARCHAR(20),
    ProblemCount INT, ParticipantCount INT, CreatedAt DATETIME2(0), TotalCount INT
);
DECLARE @Visible TABLE (
    ProblemID INT, Title NVARCHAR(200), Difficulty VARCHAR(20), TimeLimit INT, MemoryLimit INT,
    MaxScore INT, OrderIndex INT, Solved BIT, WrongCount INT, SolveMinute INT NULL
);

INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES
    ('contest_policy_owner_' + @Suffix, 'hash', 'contest_policy_owner_' + @Suffix + '@test.com', N'Contest Policy Owner', 'Teacher'),
    ('contest_policy_other_' + @Suffix, 'hash', 'contest_policy_other_' + @Suffix + '@test.com', N'Contest Policy Other', 'Teacher'),
    ('contest_policy_student_' + @Suffix, 'hash', 'contest_policy_student_' + @Suffix + '@test.com', N'Contest Policy Student', 'User');

SELECT @OwnerID = MAX(CASE WHEN Username = 'contest_policy_owner_' + @Suffix THEN UserID END),
       @OtherTeacherID = MAX(CASE WHEN Username = 'contest_policy_other_' + @Suffix THEN UserID END),
       @StudentID = MAX(CASE WHEN Username = 'contest_policy_student_' + @Suffix THEN UserID END)
FROM dbo.Users;

INSERT dbo.Problems (CreatorID, Title, Statement, Difficulty, Status)
VALUES
    (@OwnerID, N'Contest policy public ' + @Suffix, N'Test', 'Easy', 'Public'),
    (@OwnerID, N'Contest policy private ' + @Suffix, N'Test', 'Easy', 'Private'),
    (@OtherTeacherID, N'Contest policy unrelated private ' + @Suffix, N'Test', 'Easy', 'Private'),
    (@OwnerID, N'Contest policy pending ' + @Suffix, N'Test', 'Easy', 'Pending');

SELECT @PublicProblemID = MIN(CASE WHEN Title LIKE N'Contest policy public ' + @Suffix THEN ProblemID END),
       @PrivateProblemID = MIN(CASE WHEN Title LIKE N'Contest policy private ' + @Suffix THEN ProblemID END),
       @OtherPrivateID = MIN(CASE WHEN Title LIKE N'Contest policy unrelated private ' + @Suffix THEN ProblemID END),
       @PendingProblemID = MIN(CASE WHEN Title LIKE N'Contest policy pending ' + @Suffix THEN ProblemID END)
FROM dbo.Problems;

INSERT dbo.Contests (CreatorID, ContestName, StartTime, EndTime)
VALUES (@OwnerID, N'Contest problem policy ' + @Suffix, DATEADD(MINUTE, -10, SYSUTCDATETIME()), DATEADD(HOUR, 1, SYSUTCDATETIME()));
SET @ContestID = SCOPE_IDENTITY();

EXEC app.usp_Contest_AddProblem @ContestID, @PublicProblemID, @OwnerID, 100, 1;
EXEC app.usp_Contest_AddProblem @ContestID, @PrivateProblemID, @OwnerID, 100, 2;
INSERT dbo.Contest_User (ContestID, UserID) VALUES (@ContestID, @StudentID);

INSERT @JoinedContests EXEC app.usp_Contest_List
    @Status = 'All', @Page = 1, @PageSize = 20, @UserID = @StudentID, @OnlyJoined = 1;
INSERT @Results VALUES ('Joined-contest filter returns the contests the user joined',
    CASE WHEN EXISTS (SELECT 1 FROM @JoinedContests WHERE ContestID = @ContestID) THEN 1 ELSE 0 END);
DELETE FROM @JoinedContests;
INSERT @JoinedContests EXEC app.usp_Contest_List
    @Status = 'All', @Page = 1, @PageSize = 20, @UserID = @OtherTeacherID, @OnlyJoined = 1;
INSERT @Results VALUES ('Joined-contest filter excludes contests the user did not join',
    CASE WHEN NOT EXISTS (SELECT 1 FROM @JoinedContests WHERE ContestID = @ContestID) THEN 1 ELSE 0 END);

INSERT @Results VALUES ('Contest owner can add a public problem', CASE WHEN EXISTS (SELECT 1 FROM dbo.Contest_Problem WHERE ContestID = @ContestID AND ProblemID = @PublicProblemID) THEN 1 ELSE 0 END);
INSERT @Results VALUES ('Contest owner can add a private problem they own', CASE WHEN EXISTS (SELECT 1 FROM dbo.Contest_Problem WHERE ContestID = @ContestID AND ProblemID = @PrivateProblemID) THEN 1 ELSE 0 END);
INSERT @Results VALUES ('Joined participant can access public and authorized private problems',
    CASE WHEN app.ufn_CanUserAccessContestProblem(@ContestID, @PublicProblemID, @StudentID) = 1
           AND app.ufn_CanUserAccessContestProblem(@ContestID, @PrivateProblemID, @StudentID) = 1 THEN 1 ELSE 0 END);

BEGIN TRY
    EXEC app.usp_Contest_AddProblem @ContestID, @OtherPrivateID, @OwnerID, 100, 3;
    INSERT @Results VALUES ('Private problem without management rights is rejected', 0);
END TRY BEGIN CATCH
    INSERT @Results VALUES ('Private problem without management rights is rejected', CASE WHEN ERROR_NUMBER() = 50037 THEN 1 ELSE 0 END);
END CATCH;

BEGIN TRY
    EXEC app.usp_Contest_AddProblem @ContestID, @PendingProblemID, @OwnerID, 100, 4;
    INSERT @Results VALUES ('Pending problem is rejected', 0);
END TRY BEGIN CATCH
    INSERT @Results VALUES ('Pending problem is rejected', CASE WHEN ERROR_NUMBER() = 50037 THEN 1 ELSE 0 END);
END CATCH;

UPDATE dbo.Problems SET Status = 'Rejected' WHERE ProblemID = @PendingProblemID;
BEGIN TRY
    EXEC app.usp_Contest_AddProblem @ContestID, @PendingProblemID, @OwnerID, 100, 4;
    INSERT @Results VALUES ('Rejected problem is rejected', 0);
END TRY BEGIN CATCH
    INSERT @Results VALUES ('Rejected problem is rejected', CASE WHEN ERROR_NUMBER() = 50037 THEN 1 ELSE 0 END);
END CATCH;

UPDATE dbo.Problems SET Status = 'Pending' WHERE ProblemID = @PrivateProblemID;
INSERT @Results VALUES ('Problem changed to Pending is no longer accessible in contest',
    CASE WHEN app.ufn_CanUserAccessContestProblem(@ContestID, @PrivateProblemID, @StudentID) = 0 THEN 1 ELSE 0 END);

BEGIN TRY
    INSERT @Submission EXEC app.usp_Submission_Create
        @UserID = @StudentID, @ProblemID = @PrivateProblemID,
        @SourceCode = N'print(1)', @Language = 'python', @ContestID = @ContestID;
    INSERT @Results VALUES ('Pending problem rejects new contest submissions', 0);
END TRY BEGIN CATCH
    INSERT @Results VALUES ('Pending problem rejects new contest submissions', CASE WHEN ERROR_NUMBER() = 50025 THEN 1 ELSE 0 END);
END CATCH;

DELETE FROM @Visible;
INSERT @Visible EXEC app.usp_Contest_ListProblems @ContestID, @StudentID;
INSERT @Results VALUES ('Participant list hides problems that became Pending', CASE WHEN NOT EXISTS (SELECT 1 FROM @Visible WHERE ProblemID = @PrivateProblemID) THEN 1 ELSE 0 END);

UPDATE dbo.Problems SET Status = 'Hidden' WHERE ProblemID = @PrivateProblemID;
INSERT @Results VALUES ('Problem changed to Hidden is no longer accessible in contest',
    CASE WHEN app.ufn_CanUserAccessContestProblem(@ContestID, @PrivateProblemID, @StudentID) = 0 THEN 1 ELSE 0 END);
BEGIN TRY
    EXEC app.usp_Contest_AddProblem @ContestID, @PrivateProblemID, @OwnerID, 100, 5;
    INSERT @Results VALUES ('Hidden problem is rejected when added', 0);
END TRY BEGIN CATCH
    INSERT @Results VALUES ('Hidden problem is rejected when added', CASE WHEN ERROR_NUMBER() = 50037 THEN 1 ELSE 0 END);
END CATCH;

DELETE FROM @Visible;
INSERT @Visible EXEC app.usp_Contest_ListProblems @ContestID, @OwnerID;
INSERT @Results VALUES ('Contest owner retains invalid item so they can remove it', CASE WHEN EXISTS (SELECT 1 FROM @Visible WHERE ProblemID = @PrivateProblemID) THEN 1 ELSE 0 END);

UPDATE dbo.Users SET Role = 'Admin' WHERE UserID = @OwnerID;
UPDATE dbo.Problems SET Status = 'Private' WHERE ProblemID = @PrivateProblemID;
INSERT @Results VALUES ('Admin-created contest can share an authorized private problem with participants',
    CASE WHEN app.ufn_CanUserAccessContestProblem(@ContestID, @PrivateProblemID, @StudentID) = 1 THEN 1 ELSE 0 END);

EXEC app.usp_Contest_Delete @ContestID, @OwnerID;
DELETE dbo.Problems WHERE ProblemID IN (@PublicProblemID, @PrivateProblemID, @OtherPrivateID, @PendingProblemID);
DELETE dbo.Users WHERE UserID IN (@OwnerID, @OtherTeacherID, @StudentID);

SELECT Assertion, Passed FROM @Results;
