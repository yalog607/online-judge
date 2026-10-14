IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Submissions_Contest_SubmitTime' AND object_id = OBJECT_ID('dbo.Submissions'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Submissions_Contest_SubmitTime
    ON dbo.Submissions (ContestID, SubmitTime DESC)
    INCLUDE (UserID, ProblemID, Result, Language, Runtime, Memory, PassedCases);
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Contest_GetSubmissions
    @ContestID INT,
    @ActorID INT,
    @ProblemID INT = NULL,
    @Result VARCHAR(10) = NULL,
    @Page INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin'
        UNION ALL
        SELECT 1 FROM dbo.Contests WHERE ContestID = @ContestID AND CreatorID = @ActorID
        UNION ALL
        SELECT 1 FROM dbo.Contests c JOIN dbo.Classes cl ON cl.ClassID = c.ClassID AND cl.TeacherID = @ActorID WHERE c.ContestID = @ContestID
    )
        THROW 50030, 'Ban khong co quyen xem danh sach bai nop cua ky thi nay.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Contests WHERE ContestID = @ContestID)
        THROW 50020, 'Ky thi khong ton tai.', 1;

    SELECT
        COUNT(*) AS TotalSubmissions,
        COUNT(DISTINCT CASE WHEN s.Result = 'AC' THEN s.UserID END) AS SolvedUsers,
        COUNT(DISTINCT s.UserID) AS AttemptedUsers,
        CAST(ROUND(COALESCE(
            CAST(COUNT(CASE WHEN s.Result = 'AC' THEN 1 END) AS FLOAT) * 100.0 / NULLIF(COUNT(*), 0)
        , 0), 0) AS INT) AS AcRate
    FROM dbo.Submissions s
    WHERE s.ContestID = @ContestID
      AND (@ProblemID IS NULL OR s.ProblemID = @ProblemID);

    WITH Filtered AS (
        SELECT
            s.SubmissionID,
            s.UserID,
            u.Username,
            u.FullName,
            s.ProblemID,
            p.Title AS ProblemTitle,
            s.Language,
            s.Result,
            s.Runtime,
            s.Memory,
            s.PassedCases,
            s.SubmitTime,
            COUNT(*) OVER () AS TotalCount
        FROM dbo.Submissions s
        JOIN dbo.Users u ON u.UserID = s.UserID
        JOIN dbo.Problems p ON p.ProblemID = s.ProblemID
        WHERE s.ContestID = @ContestID
          AND (@ProblemID IS NULL OR s.ProblemID = @ProblemID)
          AND (@Result IS NULL OR @Result = '' OR s.Result = @Result)
    )
    SELECT *
    FROM Filtered
    ORDER BY SubmitTime DESC
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_GetSubmissions
    @ClassID INT,
    @ActorID INT,
    @ProblemID INT = NULL,
    @Result VARCHAR(10) = NULL,
    @Page INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin'
        UNION ALL
        SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND TeacherID = @ActorID
        UNION ALL
        SELECT 1 FROM dbo.Class_TA WHERE ClassID = @ClassID AND UserID_TA = @ActorID
    )
        THROW 50030, 'Ban khong co quyen xem lich su nop bai cua lop nay.', 1;

    WITH Filtered AS (
        SELECT s.SubmissionID, s.UserID, u.Username, u.FullName,
               s.ProblemID, p.Title AS ProblemTitle,
               s.Language, s.Result, s.Runtime, s.Memory, s.SubmitTime,
               COUNT(*) OVER () AS TotalCount
        FROM dbo.Submissions s
        JOIN dbo.Users u ON u.UserID = s.UserID
        JOIN dbo.Problems p ON p.ProblemID = s.ProblemID
        JOIN dbo.Class_Student cu ON cu.UserID = s.UserID AND cu.ClassID = @ClassID
        WHERE (@ProblemID IS NULL OR s.ProblemID = @ProblemID)
          AND (@Result IS NULL OR @Result = '' OR s.Result = @Result)
    )
    SELECT *
    FROM Filtered
    ORDER BY SubmitTime DESC
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO
