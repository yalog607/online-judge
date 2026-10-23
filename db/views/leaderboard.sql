CREATE OR ALTER VIEW dbo.vw_UserLeaderboard
AS
SELECT 
    u.UserID, 
    u.Username, 
    u.FullName, 
    COUNT(DISTINCT CASE WHEN s.Result = 'AC' THEN s.ProblemID END) AS SolvedProblems,
    ISNULL(SUM(cu.TotalScore), 0) AS TotalScore
FROM dbo.Users u
LEFT JOIN dbo.Submissions s ON u.UserID = s.UserID
LEFT JOIN dbo.Contest_User cu ON u.UserID = cu.UserID
WHERE u.Role = 'User' AND u.Status = 'Active'
GROUP BY u.UserID, u.Username, u.FullName;
GO
