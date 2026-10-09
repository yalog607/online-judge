DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @UserID INT, @ProblemID INT, @SubID INT;
DECLARE @Created TABLE (ProblemID INT);
DECLARE @Claimed TABLE (SubmissionID INT, ProblemID INT, SourceCode NVARCHAR(MAX), Language VARCHAR(20), TimeLimit INT, MemoryLimit INT, JudgeMode VARCHAR(20), FunctionSpec NVARCHAR(MAX));
DECLARE @Spec NVARCHAR(MAX) = N'{"name":"twoSum","params":[{"name":"nums","type":"int[]"},{"name":"target","type":"int"}],"returns":"int[]"}';

BEGIN TRANSACTION;

INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES ('fn_user', 'x', 'fn_user@test.com', N'FN User', 'Teacher');
SET @UserID = SCOPE_IDENTITY();

-- legacy problems default to stdin mode
INSERT dbo.Problems (CreatorID, Title, Statement, Difficulty) VALUES (@UserID, N'legacy', N'legacy', 'Easy');
INSERT @Results SELECT 'new problem defaults to stdin mode',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE Title = N'legacy' AND JudgeMode = 'stdin' AND FunctionSpec IS NULL) THEN 1 ELSE 0 END;

-- function problem round-trips through create/get
INSERT @Created EXEC app.usp_Problem_Create @UserID, N'fn', N'fn', NULL, NULL, 1000, 256, NULL, 'Easy', 'Public', NULL, NULL, 'function', @Spec;
SELECT TOP 1 @ProblemID = ProblemID FROM @Created;
INSERT @Results SELECT 'function problem keeps its spec',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND JudgeMode = 'function' AND FunctionSpec = @Spec) THEN 1 ELSE 0 END;

-- function mode without a spec is rejected by the CHECK constraint
BEGIN TRY
    UPDATE dbo.Problems SET FunctionSpec = NULL WHERE ProblemID = @ProblemID;
    INSERT @Results SELECT 'function mode without spec is rejected', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'function mode without spec is rejected', CASE WHEN ERROR_NUMBER() = 547 THEN 1 ELSE 0 END;
END CATCH;

IF XACT_STATE() = 1
BEGIN
    -- switching back to stdin clears the spec
    EXEC app.usp_Problem_Update @ProblemID, @UserID, N'fn', N'fn', NULL, NULL, 1000, 256, NULL, 'Easy', NULL, 'stdin', NULL;
    INSERT @Results SELECT 'switching to stdin clears the spec',
        CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND JudgeMode = 'stdin' AND FunctionSpec IS NULL) THEN 1 ELSE 0 END;

    EXEC app.usp_Problem_Update @ProblemID, @UserID, N'fn', N'fn', NULL, NULL, 1000, 256, NULL, 'Easy', NULL, 'function', @Spec;
    INSERT dbo.Submissions (UserID, ProblemID, SourceCode, Language) VALUES (@UserID, @ProblemID, 'x', 'python');
    SET @SubID = SCOPE_IDENTITY();
    INSERT @Claimed EXEC app.usp_Judge_Claim @SubID, 'w1';
    INSERT @Results SELECT 'claim returns judge mode and spec',
        CASE WHEN EXISTS (SELECT 1 FROM @Claimed WHERE JudgeMode = 'function' AND FunctionSpec = @Spec) THEN 1 ELSE 0 END;
END;

IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;
