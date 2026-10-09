DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @UserID INT, @ProblemID INT, @SubID INT, @Rows INT;
DECLARE @Claimed TABLE (SubmissionID INT, ProblemID INT, SourceCode NVARCHAR(MAX), Language VARCHAR(20), TimeLimit INT, MemoryLimit INT, JudgeMode VARCHAR(20), FunctionSpec NVARCHAR(MAX));

BEGIN TRANSACTION;

INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES ('jq_user', 'x', 'jq_user@test.com', N'JQ User', 'Teacher');
SET @UserID = SCOPE_IDENTITY();
INSERT dbo.Problems (CreatorID, Title, Statement, Difficulty) VALUES (@UserID, N'jq', N'jq', 'Easy');
SET @ProblemID = SCOPE_IDENTITY();
INSERT dbo.Submissions (UserID, ProblemID, SourceCode, Language) VALUES (@UserID, @ProblemID, 'x', 'python');
SET @SubID = SCOPE_IDENTITY();

INSERT @Claimed EXEC app.usp_Judge_Claim @SubID, 'w1';
INSERT @Results SELECT 'first claim returns the submission', CASE WHEN (SELECT COUNT(*) FROM @Claimed) = 1 THEN 1 ELSE 0 END;

DELETE @Claimed;
INSERT @Claimed EXEC app.usp_Judge_Claim @SubID, 'w2';
INSERT @Results SELECT 'second claim returns nothing', CASE WHEN (SELECT COUNT(*) FROM @Claimed) = 0 THEN 1 ELSE 0 END;

BEGIN TRY
    EXEC app.usp_Judge_SaveResult @SubID, 'AC', 1, 0, '0/0', '[]', 'w2';
    INSERT @Results SELECT 'save by non-owner is rejected', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'save by non-owner is rejected', CASE WHEN ERROR_NUMBER() = 50090 THEN 1 ELSE 0 END;
END CATCH;

IF XACT_STATE() = 1
BEGIN
    EXEC app.usp_Judge_SaveResult @SubID, 'AC', 1, 0, '0/0', '[]', 'w1';
    INSERT @Results SELECT 'save by owner stores result and clears claim',
        CASE WHEN EXISTS (SELECT 1 FROM dbo.Submissions WHERE SubmissionID = @SubID AND Result = 'AC' AND ClaimedBy IS NULL) THEN 1 ELSE 0 END;

    UPDATE dbo.Submissions SET Result = 'Judging', ClaimedBy = 'dead', ClaimedAt = DATEADD(HOUR, -1, SYSUTCDATETIME()) WHERE SubmissionID = @SubID;
    DECLARE @Ids TABLE (SubmissionID INT);
    INSERT @Ids EXEC app.usp_Judge_RequeueStale 900;
    INSERT @Results SELECT 'stale judging submission is requeued',
        CASE WHEN EXISTS (SELECT 1 FROM @Ids WHERE SubmissionID = @SubID)
              AND EXISTS (SELECT 1 FROM dbo.Submissions WHERE SubmissionID = @SubID AND Result = 'Pending') THEN 1 ELSE 0 END;
END;

IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;
