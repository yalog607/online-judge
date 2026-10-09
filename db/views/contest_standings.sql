CREATE OR ALTER VIEW dbo.vw_ContestStandings AS
SELECT 
    c.ContestID,
    c.ContestName AS Title,
    u.Username,
    cu.TotalScore,
    cu.PenaltyTime
FROM dbo.Contest_User cu
JOIN dbo.Contests c ON cu.ContestID = c.ContestID
JOIN dbo.Users u ON cu.UserID = u.UserID;
GO
