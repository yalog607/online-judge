-- DEPRECATED: jobs are now delivered through the Redis queue and claimed by id
-- with app.usp_Judge_Claim. Kept only for backward compatibility.
-- Atomically claims one pending submission; READPAST lets other workers skip rows
-- already locked by a concurrent claim instead of blocking on them.
CREATE OR ALTER PROCEDURE app.usp_Judge_ClaimNext
    @WorkerID VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Ids TABLE (SubmissionID INT);

    UPDATE TOP (1) dbo.Submissions WITH (READPAST)
    SET Result = 'Judging', ClaimedBy = @WorkerID, ClaimedAt = SYSUTCDATETIME()
    OUTPUT inserted.SubmissionID INTO @Ids
    WHERE Result = 'Pending';

    SELECT s.SubmissionID, s.ProblemID, s.SourceCode, s.Language, p.TimeLimit, p.MemoryLimit
    FROM dbo.Submissions s
    JOIN dbo.Problems p ON p.ProblemID = s.ProblemID
    WHERE s.SubmissionID IN (SELECT SubmissionID FROM @Ids);
END
GO

-- Claims one specific submission delivered by the queue. Returns no rows when the
-- submission is already claimed/judged, so duplicate or replayed jobs are harmless.
CREATE OR ALTER PROCEDURE app.usp_Judge_Claim
    @SubmissionID INT,
    @WorkerID VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Submissions
    SET Result = 'Judging', ClaimedBy = @WorkerID, ClaimedAt = SYSUTCDATETIME()
    WHERE SubmissionID = @SubmissionID AND Result = 'Pending';

    IF @@ROWCOUNT = 0 RETURN;

    SELECT s.SubmissionID, s.ProblemID, s.SourceCode, s.Language, p.TimeLimit, p.MemoryLimit
    FROM dbo.Submissions s
    JOIN dbo.Problems p ON p.ProblemID = s.ProblemID
    WHERE s.SubmissionID = @SubmissionID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Testcase_ListForJudge
    @ProblemID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TestCaseID, InputData, ExpectedOutput
    FROM dbo.Testcases WHERE ProblemID = @ProblemID
    ORDER BY OrderIndex;
END
GO

-- @ResultsJson: [{"testCaseId":1,"verdict":"AC","runtime":10,"memory":4.2}, ...]
CREATE OR ALTER PROCEDURE app.usp_Judge_SaveResult
    @SubmissionID INT,
    @Result VARCHAR(20),
    @Runtime INT,
    @Memory FLOAT,
    @PassedCases VARCHAR(50),
    @ResultsJson NVARCHAR(MAX),
    @WorkerID VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    UPDATE dbo.Submissions
    SET Result = @Result, Runtime = @Runtime, Memory = @Memory,
        PassedCases = @PassedCases, JudgedAt = SYSUTCDATETIME(),
        ClaimedBy = NULL, ClaimedAt = NULL
    WHERE SubmissionID = @SubmissionID AND Result = 'Judging' AND ClaimedBy = @WorkerID;

    IF @@ROWCOUNT = 0
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50090, N'Submission is no longer claimed by this worker.', 1;
    END;

    DELETE FROM dbo.SubmissionResults WHERE SubmissionID = @SubmissionID;

    INSERT dbo.SubmissionResults (SubmissionID, TestCaseID, Verdict, Runtime, Memory)
    SELECT @SubmissionID, t.testCaseId, t.verdict, t.runtime, t.memory
    FROM OPENJSON(@ResultsJson) WITH (
        testCaseId INT '$.testCaseId',
        verdict VARCHAR(20) '$.verdict',
        runtime INT '$.runtime',
        memory FLOAT '$.memory'
    ) t;

    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Judge_Heartbeat
    @WorkerID VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.JudgeWorkers SET LastSeenAt = SYSUTCDATETIME() WHERE WorkerID = @WorkerID;
    IF @@ROWCOUNT = 0
        INSERT dbo.JudgeWorkers (WorkerID, StartedAt, LastSeenAt)
        VALUES (@WorkerID, SYSUTCDATETIME(), SYSUTCDATETIME());
END
GO

-- Puts stale 'Judging' rows (worker died) back to 'Pending', then returns every
-- Pending submission id so the caller can (re-)enqueue them.
CREATE OR ALTER PROCEDURE app.usp_Judge_RequeueStale
    @StaleSeconds INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Submissions
    SET Result = 'Pending', ClaimedBy = NULL, ClaimedAt = NULL
    WHERE Result = 'Judging'
      AND ClaimedAt < DATEADD(SECOND, -@StaleSeconds, SYSUTCDATETIME());

    SELECT SubmissionID FROM dbo.Submissions WHERE Result = 'Pending' ORDER BY SubmissionID;
END
GO

-- Gives a claimed submission back to the queue (e.g. after an infrastructure failure)
-- so a retried job can claim it again.
CREATE OR ALTER PROCEDURE app.usp_Judge_Release
    @SubmissionID INT,
    @WorkerID VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Submissions
    SET Result = 'Pending', ClaimedBy = NULL, ClaimedAt = NULL
    WHERE SubmissionID = @SubmissionID AND Result = 'Judging' AND ClaimedBy = @WorkerID;
END
GO
