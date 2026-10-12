DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @UserID INT, @ProblemID INT, @SubID INT;
DECLARE @Created TABLE (ProblemID INT);
DECLARE @Claimed TABLE (SubmissionID INT, ProblemID INT, SourceCode NVARCHAR(MAX), Language VARCHAR(20), TimeLimit INT, MemoryLimit INT, FunctionSpec NVARCHAR(MAX));
DECLARE @Spec NVARCHAR(MAX) = N'{"name":"twoSum","params":[{"name":"nums","type":"int[]"},{"name":"target","type":"int"}],"returns":"int[]"}';
DECLARE @Spec2 NVARCHAR(MAX) = N'{"name":"twoSum","params":[{"name":"nums","type":"int[]"}],"returns":"int"}';

BEGIN TRANSACTION;

INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES ('fn_user', 'x', 'fn_user@test.com', N'FN User', 'Teacher');
SET @UserID = SCOPE_IDENTITY();

-- the stdin/stdout judge mode no longer exists in the schema
INSERT @Results SELECT 'JudgeMode column is removed',
    CASE WHEN COL_LENGTH('dbo.Problems', 'JudgeMode') IS NULL THEN 1 ELSE 0 END;

-- legacy problems (no signature) stay readable with a NULL spec
INSERT dbo.Problems (CreatorID, Title, Statement, Difficulty) VALUES (@UserID, N'legacy', N'legacy', 'Easy');
INSERT @Results SELECT 'legacy problem has no function spec',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE Title = N'legacy' AND FunctionSpec IS NULL) THEN 1 ELSE 0 END;

-- function problem round-trips through create/get
INSERT @Created EXEC app.usp_Problem_Create @UserID, N'fn', N'fn', NULL, NULL, 1000, 256, NULL, 'Easy', 'Public', NULL, NULL, @Spec;
SELECT TOP 1 @ProblemID = ProblemID FROM @Created;
INSERT @Results SELECT 'function problem keeps its spec',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND FunctionSpec = @Spec) THEN 1 ELSE 0 END;

-- update replaces the spec
EXEC app.usp_Problem_Update @ProblemID, @UserID, N'fn', N'fn', NULL, NULL, 1000, 256, NULL, 'Easy', NULL, @Spec2;
INSERT @Results SELECT 'update replaces the function spec',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND FunctionSpec = @Spec2) THEN 1 ELSE 0 END;

-- claim returns the spec for the worker
EXEC app.usp_Problem_Update @ProblemID, @UserID, N'fn', N'fn', NULL, NULL, 1000, 256, NULL, 'Easy', NULL, @Spec;
INSERT dbo.Submissions (UserID, ProblemID, SourceCode, Language) VALUES (@UserID, @ProblemID, 'x', 'python');
SET @SubID = SCOPE_IDENTITY();
INSERT @Claimed EXEC app.usp_Judge_Claim @SubID, 'w1';
INSERT @Results SELECT 'claim returns the function spec',
    CASE WHEN EXISTS (SELECT 1 FROM @Claimed WHERE FunctionSpec = @Spec) THEN 1 ELSE 0 END;

IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;
