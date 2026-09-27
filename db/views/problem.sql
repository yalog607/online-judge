CREATE OR ALTER VIEW dbo.vw_ProblemAcRate AS
SELECT
    ProblemID,
    COUNT(*) AS SubmissionCount,
    100.0 * SUM(CASE WHEN Result = 'AC' THEN 1 ELSE 0 END) / COUNT(*) AS AcRate
FROM dbo.Submissions
GROUP BY ProblemID;
GO
