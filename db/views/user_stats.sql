CREATE OR ALTER VIEW dbo.vw_UserSubmissionStats
AS
SELECT 
    UserID,
    COUNT(SubmissionID) AS TotalSubmissions,
    SUM(CASE WHEN Result = 'AC' THEN 1 ELSE 0 END) AS TotalAC,
    SUM(CASE WHEN Result = 'WA' THEN 1 ELSE 0 END) AS TotalWA,
    SUM(CASE WHEN Result = 'TLE' THEN 1 ELSE 0 END) AS TotalTLE,
    SUM(CASE WHEN Result = 'RE' THEN 1 ELSE 0 END) AS TotalRE,
    SUM(CASE WHEN Result = 'CE' THEN 1 ELSE 0 END) AS TotalCE
FROM dbo.Submissions
GROUP BY UserID;
GO
