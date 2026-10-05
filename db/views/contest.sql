CREATE OR ALTER VIEW app.uvw_ContestOverview
AS
SELECT
    c.ContestID,
    c.CreatorID,
    u.FullName AS CreatorName,
    u.Username AS CreatorUsername,
    c.ContestName,
    c.Description,
    c.StartTime,
    c.EndTime,
    c.ClassID,
    cls.ClassName,
    CAST(CASE WHEN c.Password IS NOT NULL AND LEN(c.Password) > 0 THEN 1 ELSE 0 END AS BIT) AS IsProtected,
    app.ufn_GetContestStatus(c.StartTime, c.EndTime) AS [Status],
    (SELECT COUNT(*) FROM dbo.Contest_Problem cp WHERE cp.ContestID = c.ContestID) AS ProblemCount,
    (SELECT COUNT(*) FROM dbo.Contest_User cu WHERE cu.ContestID = c.ContestID) AS ParticipantCount,
    c.CreatedAt
FROM dbo.Contests c
JOIN dbo.Users u ON u.UserID = c.CreatorID
LEFT JOIN dbo.Classes cls ON cls.ClassID = c.ClassID;
GO
