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
    @ResultsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    UPDATE dbo.Submissions
    SET Result = @Result, Runtime = @Runtime, Memory = @Memory,
        PassedCases = @PassedCases, JudgedAt = SYSUTCDATETIME()
    WHERE SubmissionID = @SubmissionID;

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
