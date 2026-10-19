DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
BEGIN TRANSACTION;
DECLARE @Sfx VARCHAR(8) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @OwnerID INT, @StudentID INT, @ProblemID INT, @ContestID INT, @Sub1 INT, @Sub2 INT, @Sub3 INT;

INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('ps_o_' + @Sfx, 'hash', 'ps_o_' + @Sfx + '@test.com', N'PS Owner', 'Teacher');
SET @OwnerID = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('ps_s_' + @Sfx, 'hash', 'ps_s_' + @Sfx + '@test.com', N'PS Student', 'User');
SET @StudentID = SCOPE_IDENTITY();
INSERT dbo.Problems (CreatorID, Title, Statement, Difficulty, Status) VALUES (@OwnerID, N'PS Problem ' + @Sfx, N'Test', 'Easy', 'Public');
SET @ProblemID = SCOPE_IDENTITY();
INSERT dbo.Contests (CreatorID, ContestName, StartTime, EndTime)
VALUES (@OwnerID, N'PS Contest ' + @Sfx, DATEADD(HOUR, -1, SYSUTCDATETIME()), DATEADD(DAY, 1, SYSUTCDATETIME()));
SET @ContestID = SCOPE_IDENTITY();
INSERT dbo.Contest_Problem (ContestID, ProblemID, MaxScore, OrderIndex) VALUES (@ContestID, @ProblemID, 100, 1);
INSERT dbo.Contest_User (ContestID, UserID, TotalScore, PenaltyTime) VALUES (@ContestID, @StudentID, 0, 0);

INSERT dbo.Submissions (UserID, ProblemID, ContestID, SourceCode, Language) VALUES (@StudentID, @ProblemID, @ContestID, 'x', 'python');
SET @Sub1 = SCOPE_IDENTITY();
UPDATE dbo.Submissions SET Result = 'WA', PassedCases = '1/4' WHERE SubmissionID = @Sub1;
INSERT @Results VALUES ('1/4 testcases passed gives 25 of 100 points',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Contest_User WHERE ContestID = @ContestID AND UserID = @StudentID AND TotalScore = 25) THEN 1 ELSE 0 END);

INSERT dbo.Submissions (UserID, ProblemID, ContestID, SourceCode, Language) VALUES (@StudentID, @ProblemID, @ContestID, 'x', 'python');
SET @Sub2 = SCOPE_IDENTITY();
UPDATE dbo.Submissions SET Result = 'WA', PassedCases = '3/4' WHERE SubmissionID = @Sub2;
INSERT @Results VALUES ('Best submission counts: 3/4 gives 75 points',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Contest_User WHERE ContestID = @ContestID AND UserID = @StudentID AND TotalScore = 75) THEN 1 ELSE 0 END);

INSERT dbo.Submissions (UserID, ProblemID, ContestID, SourceCode, Language) VALUES (@StudentID, @ProblemID, @ContestID, 'x', 'python');
SET @Sub3 = SCOPE_IDENTITY();
UPDATE dbo.Submissions SET Result = 'WA', PassedCases = '1/4' WHERE SubmissionID = @Sub3;
INSERT @Results VALUES ('A worse later submission does not lower the score',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Contest_User WHERE ContestID = @ContestID AND UserID = @StudentID AND TotalScore = 75) THEN 1 ELSE 0 END);

UPDATE dbo.Submissions SET Result = 'AC', PassedCases = '4/4' WHERE SubmissionID = @Sub3;
INSERT @Results VALUES ('AC gives full 100 points',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Contest_User WHERE ContestID = @ContestID AND UserID = @StudentID AND TotalScore = 100) THEN 1 ELSE 0 END);

-- Bài nộp không xóa được (trigger), nên hoàn tác toàn bộ dữ liệu của test.
ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;
