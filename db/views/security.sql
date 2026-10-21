CREATE OR ALTER VIEW app.uvw_PublicProblems_Security
AS
SELECT ProblemID, Title, Difficulty, TimeLimitMs, MemoryLimitMb, Status
FROM dbo.Problems
WHERE Status = 'Public'
WITH CHECK OPTION;
GO
