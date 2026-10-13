IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Submissions_Problem_SubmitTime' AND object_id = OBJECT_ID('dbo.Submissions'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Submissions_Problem_SubmitTime
    ON dbo.Submissions (ProblemID, SubmitTime DESC)
    INCLUDE (UserID, Result, Language, Runtime, Memory, PassedCases);
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Problem_GetSubmissions
    @ProblemID INT,
    @ActorID INT,
    @Result VARCHAR(10) = NULL,
    @Page INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role IN ('Teacher', 'Admin', 'TA'))
        THROW 50027, 'Ban khong co quyen xem danh sach bai nop cua bai tap nay.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID)
        THROW 50021, 'Bai tap khong ton tai.', 1;

    SELECT
        COUNT(*) AS TotalSubmissions,
        COUNT(DISTINCT CASE WHEN s.Result = 'AC' THEN s.UserID END) AS SolvedUsers,
        COUNT(DISTINCT s.UserID) AS AttemptedUsers,
        CAST(ROUND(COALESCE(
            CAST(COUNT(CASE WHEN s.Result = 'AC' THEN 1 END) AS FLOAT) * 100.0 / NULLIF(COUNT(*), 0)
        , 0), 0) AS INT) AS AcRate
    FROM dbo.Submissions s
    WHERE s.ProblemID = @ProblemID;

    WITH Filtered AS (
        SELECT
            s.SubmissionID,
            s.UserID,
            u.Username,
            u.FullName,
            s.Language,
            s.Result,
            s.Runtime,
            s.Memory,
            s.PassedCases,
            s.SubmitTime,
            COUNT(*) OVER () AS TotalCount
        FROM dbo.Submissions s
        JOIN dbo.Users u ON u.UserID = s.UserID
        WHERE s.ProblemID = @ProblemID
          AND (@Result IS NULL OR @Result = '' OR s.Result = @Result)
    )
    SELECT *
    FROM Filtered
    ORDER BY SubmitTime DESC
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO
