CREATE OR ALTER VIEW dbo.vw_RecentSubmissions AS
SELECT TOP 100
    s.SubmissionID,
    u.Username,
    p.Title AS ProblemTitle,
    s.Result,
    s.SubmitTime,
    s.Language
FROM dbo.Submissions s
JOIN dbo.Users u ON s.UserID = u.UserID
JOIN dbo.Problems p ON s.ProblemID = p.ProblemID
ORDER BY s.SubmitTime DESC;
GO
