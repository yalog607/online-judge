CREATE OR ALTER VIEW dbo.vw_UserSubmissionStats AS
SELECT 
    UserID,
    COUNT(SubmissionID) AS TotalSubmissions,
    SUM(CASE WHEN Result = 'AC' THEN 1 ELSE 0 END) AS TotalAC,
    SUM(CASE WHEN Result = 'WA' THEN 1 ELSE 0 END) AS TotalWA
FROM dbo.Submissions
GROUP BY UserID;
GO
