DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
BEGIN TRANSACTION;
DECLARE @Sfx VARCHAR(8) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @OwnerID INT, @U1 INT, @U2 INT, @ProblemID INT, @S1 INT, @S2 INT, @S3 INT;
DECLARE @Ids TABLE (SubmissionID INT);

INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('rj_o_' + @Sfx, 'hash', 'rj_o_' + @Sfx + '@test.com', N'RJ Owner', 'Teacher');
SET @OwnerID = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('rj_a_' + @Sfx, 'hash', 'rj_a_' + @Sfx + '@test.com', N'RJ A', 'User');
SET @U1 = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('rj_b_' + @Sfx, 'hash', 'rj_b_' + @Sfx + '@test.com', N'RJ B', 'User');
SET @U2 = SCOPE_IDENTITY();
INSERT dbo.Problems (CreatorID, Title, Statement, Difficulty, Status) VALUES (@OwnerID, N'RJ Problem ' + @Sfx, N'Test', 'Easy', 'Public');
SET @ProblemID = SCOPE_IDENTITY();

INSERT dbo.Submissions (UserID, ProblemID, SourceCode, Language, SubmitTime, Result) VALUES (@U1, @ProblemID, 'x', 'python', '2025-01-01', 'AC');
SET @S1 = SCOPE_IDENTITY();
INSERT dbo.Submissions (UserID, ProblemID, SourceCode, Language, SubmitTime, Result) VALUES (@U1, @ProblemID, 'x', 'python', '2025-01-02', 'WA');
SET @S2 = SCOPE_IDENTITY();
INSERT dbo.Submissions (UserID, ProblemID, SourceCode, Language, SubmitTime, Result) VALUES (@U2, @ProblemID, 'x', 'python', '2025-01-03', 'CE');
SET @S3 = SCOPE_IDENTITY();

INSERT @Ids EXEC app.usp_Judge_RejudgeProblemLatest @ProblemID = @ProblemID;

INSERT @Results VALUES ('Returns the latest submission of each user only',
    CASE WHEN (SELECT COUNT(*) FROM @Ids) = 2 AND EXISTS (SELECT 1 FROM @Ids WHERE SubmissionID = @S2)
          AND EXISTS (SELECT 1 FROM @Ids WHERE SubmissionID = @S3) AND NOT EXISTS (SELECT 1 FROM @Ids WHERE SubmissionID = @S1)
         THEN 1 ELSE 0 END);
INSERT @Results VALUES ('Latest submissions become Pending, older ones are untouched',
    CASE WHEN (SELECT Result FROM dbo.Submissions WHERE SubmissionID = @S2) = 'Pending'
          AND (SELECT Result FROM dbo.Submissions WHERE SubmissionID = @S3) = 'Pending'
          AND (SELECT Result FROM dbo.Submissions WHERE SubmissionID = @S1) = 'AC' THEN 1 ELSE 0 END);

DELETE FROM @Ids;
INSERT @Ids EXEC app.usp_Judge_RejudgeProblemLatest @ProblemID = @ProblemID;
INSERT @Results VALUES ('Pending submissions are not rejudged twice',
    CASE WHEN (SELECT COUNT(*) FROM @Ids) = 0 AND (SELECT Result FROM dbo.Submissions WHERE SubmissionID = @S1) = 'AC' THEN 1 ELSE 0 END);

ROLLBACK TRANSACTION;
SELECT Assertion, Passed FROM @Results;
