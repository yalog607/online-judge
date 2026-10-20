-- Điểm kỳ thi theo tỉ lệ testcase đạt: mỗi câu lưu tỉ lệ tốt nhất (0..1), điểm = tỉ lệ x điểm của câu.
ALTER TABLE dbo.ContestProblemResults
    ADD BestRatio DECIMAL(5, 4) NOT NULL CONSTRAINT DF_CPR_BestRatio DEFAULT 0;
GO

DROP INDEX IX_ContU_Rank ON dbo.Contest_User;
ALTER TABLE dbo.Contest_User DROP CONSTRAINT CK_ContU_Score;
ALTER TABLE dbo.Contest_User DROP CONSTRAINT DF_ContU_Score;
ALTER TABLE dbo.Contest_User ALTER COLUMN TotalScore DECIMAL(9, 2) NOT NULL;
ALTER TABLE dbo.Contest_User ADD CONSTRAINT DF_ContU_Score DEFAULT 0 FOR TotalScore;
ALTER TABLE dbo.Contest_User ADD CONSTRAINT CK_ContU_Score CHECK (TotalScore >= 0);
CREATE INDEX IX_ContU_Rank ON dbo.Contest_User (ContestID, TotalScore DESC, PenaltyTime ASC);
GO

-- Tính lại từ các lần nộp đã chấm trong kỳ thi.
UPDATE cpr
SET BestRatio = ISNULL(best.Ratio, 0)
FROM dbo.ContestProblemResults cpr
OUTER APPLY (
    SELECT MAX(
        CASE
            WHEN s.Result = 'AC' THEN 1.0
            WHEN s.MaxScore > 0 THEN
                CASE WHEN ISNULL(s.Score, 0) >= s.MaxScore THEN 1.0 ELSE CAST(ISNULL(s.Score, 0) AS FLOAT) / s.MaxScore END
            WHEN p.Total > 0 THEN
                CASE WHEN p.Passed >= p.Total THEN 1.0 ELSE CAST(p.Passed AS FLOAT) / p.Total END
            ELSE 0.0
        END) AS Ratio
    FROM dbo.Submissions s
    CROSS APPLY (
        SELECT
            TRY_CAST(LEFT(s.PassedCases, CHARINDEX('/', s.PassedCases + '/') - 1) AS INT) AS Passed,
            TRY_CAST(SUBSTRING(s.PassedCases, CHARINDEX('/', s.PassedCases + '/') + 1, 20) AS INT) AS Total
    ) p
    WHERE s.ContestID = cpr.ContestID AND s.UserID = cpr.UserID AND s.ProblemID = cpr.ProblemID
      AND s.Result IN ('AC', 'WA', 'TLE', 'MLE', 'RE')
) best;
GO

UPDATE cu
SET TotalScore = ISNULL(sc.Total, 0)
FROM dbo.Contest_User cu
OUTER APPLY (
    SELECT SUM(cpr.BestRatio * cp.MaxScore) AS Total
    FROM dbo.ContestProblemResults cpr
    JOIN dbo.Contest_Problem cp ON cp.ContestID = cpr.ContestID AND cp.ProblemID = cpr.ProblemID
    WHERE cpr.ContestID = cu.ContestID AND cpr.UserID = cu.UserID
) sc;
GO
