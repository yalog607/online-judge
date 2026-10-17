DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @UserID INT, @ProblemID INT, @SubID INT;
DECLARE @Judge TABLE (TestCaseID INT, InputData NVARCHAR(MAX), ExpectedOutput NVARCHAR(MAX), GroupNo INT);
DECLARE @Checker TABLE (CompareMode VARCHAR(20), FloatEpsilon FLOAT);
DECLARE @Groups TABLE (GroupNo INT, Points INT);

BEGIN TRANSACTION;

INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES ('sc_user', 'x', 'sc_user@test.com', N'SC User', 'Teacher');
SET @UserID = SCOPE_IDENTITY();
INSERT dbo.Problems (CreatorID, Title, Statement, Difficulty) VALUES (@UserID, N'sc', N'sc', 'Easy');
SET @ProblemID = SCOPE_IDENTITY();

INSERT @Checker EXEC app.usp_Judge_GetChecker @ProblemID;
INSERT @Results SELECT 'checker defaults to exact',
    CASE WHEN EXISTS (SELECT 1 FROM @Checker WHERE CompareMode = 'exact' AND FloatEpsilon IS NULL) THEN 1 ELSE 0 END;

EXEC app.usp_Testcase_ReplaceAll @ProblemID, @UserID,
    N'[{"input":"1","expectedOutput":"1","isHidden":true,"groupNo":1},{"input":"2","expectedOutput":"2","isHidden":true,"groupNo":2},{"input":"3","expectedOutput":"3","isHidden":true}]',
    N'{"compareMode":"float","floatEpsilon":0.001,"groups":[{"groupNo":1,"points":40},{"groupNo":2,"points":60}]}';

DELETE @Checker;
INSERT @Checker EXEC app.usp_Judge_GetChecker @ProblemID;
INSERT @Results SELECT 'scoring json stores checker settings',
    CASE WHEN EXISTS (SELECT 1 FROM @Checker WHERE CompareMode = 'float' AND FloatEpsilon = 0.001) THEN 1 ELSE 0 END;

INSERT @Groups EXEC app.usp_Judge_ListGroups @ProblemID;
INSERT @Results SELECT 'groups are stored with points',
    CASE WHEN (SELECT COUNT(*) FROM @Groups) = 2 AND (SELECT SUM(Points) FROM @Groups) = 100 THEN 1 ELSE 0 END;

INSERT @Judge EXEC app.usp_Testcase_ListForJudge @ProblemID;
INSERT @Results SELECT 'judge testcases carry their group',
    CASE WHEN (SELECT COUNT(*) FROM @Judge WHERE GroupNo IS NOT NULL) = 2
          AND (SELECT COUNT(*) FROM @Judge WHERE GroupNo IS NULL) = 1 THEN 1 ELSE 0 END;

-- omitting @ScoringJson keeps the checker settings and groups
EXEC app.usp_Testcase_ReplaceAll @ProblemID, @UserID, N'[{"input":"1","expectedOutput":"1","isHidden":true}]';
DELETE @Checker;
INSERT @Checker EXEC app.usp_Judge_GetChecker @ProblemID;
INSERT @Results SELECT 'replace without scoring keeps checker settings',
    CASE WHEN EXISTS (SELECT 1 FROM @Checker WHERE CompareMode = 'float')
          AND (SELECT COUNT(*) FROM dbo.TestcaseGroups WHERE ProblemID = @ProblemID) = 2 THEN 1 ELSE 0 END;

BEGIN TRY
    UPDATE dbo.Problems SET CompareMode = 'regex' WHERE ProblemID = @ProblemID;
    INSERT @Results SELECT 'unknown compare mode is rejected', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'unknown compare mode is rejected', 1;
END CATCH;

-- score is stored by SaveResult
INSERT dbo.Submissions (UserID, ProblemID, SourceCode, Language) VALUES (@UserID, @ProblemID, 'x', 'python');
SET @SubID = SCOPE_IDENTITY();
UPDATE dbo.Submissions SET Result = 'Judging', ClaimedBy = 'w1', ClaimedAt = SYSUTCDATETIME() WHERE SubmissionID = @SubID;
EXEC app.usp_Judge_SaveResult @SubID, 'WA', 5, 8.5, '1/2', '[]', 'w1', 60, 100;
INSERT @Results SELECT 'save result stores score and max score',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Submissions WHERE SubmissionID = @SubID AND Score = 60 AND MaxScore = 100 AND Memory = 8.5) THEN 1 ELSE 0 END;

IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;
