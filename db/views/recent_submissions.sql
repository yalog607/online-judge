CREATE OR ALTER VIEW dbo.vw_RecentSubmissions
AS
SELECT TOP 100
    s.SubmissionID,
    u.Username,
    p.Title AS ProblemTitle,
    s.Language,
    s.Result,
    s.Runtime,
    s.Memory,
    s.SubmitTime
FROM dbo.Submissions s
JOIN dbo.Users u ON s.UserID = u.UserID
JOIN dbo.Problems p ON s.ProblemID = p.ProblemID
ORDER BY s.SubmitTime DESC;
GO
