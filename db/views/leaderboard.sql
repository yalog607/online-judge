CREATE OR ALTER VIEW dbo.vw_UserLeaderboard AS
SELECT 
    u.UserID, 
    u.Username, 
    u.FullName, 
    ISNULL(SUM(cu.TotalScore), 0) AS TotalScore
FROM dbo.Users u
LEFT JOIN dbo.Contest_User cu ON u.UserID = cu.UserID
GROUP BY u.UserID, u.Username, u.FullName;
GO
