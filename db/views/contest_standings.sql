CREATE OR ALTER VIEW dbo.vw_ContestStandings
AS
SELECT 
    cu.ContestID,
    c.ContestName,
    cu.UserID,
    u.Username,
    u.FullName,
    cu.TotalScore,
    cu.PenaltyTime,
    DENSE_RANK() OVER (
        PARTITION BY cu.ContestID 
        ORDER BY cu.TotalScore DESC, cu.PenaltyTime ASC
    ) AS LiveRank
FROM dbo.Contest_User cu
INNER JOIN dbo.Contests c ON cu.ContestID = c.ContestID
INNER JOIN dbo.Users u ON cu.UserID = u.UserID;
GO
