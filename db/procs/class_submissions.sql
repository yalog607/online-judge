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
        THROW 50030, N'Bạn không có quyền xem lịch sử nộp bài của lớp này.', 1;

    WITH Filtered AS (
        SELECT s.SubmissionID, s.UserID, u.Username, u.FullName,
               s.ProblemID, p.Title AS ProblemTitle,
               s.Language, s.Result, s.Runtime, s.Memory, s.SubmitTime,
               COUNT(*) OVER () AS TotalCount
        FROM dbo.Submissions s
        JOIN dbo.Users u ON u.UserID = s.UserID
        JOIN dbo.Problems p ON p.ProblemID = s.ProblemID
        JOIN dbo.Class_Student cu ON cu.UserID = s.UserID AND cu.ClassID = @ClassID
        WHERE s.ClassID = @ClassID
          AND (@ProblemID IS NULL OR s.ProblemID = @ProblemID)
          AND (@Result IS NULL OR @Result = '' OR s.Result = @Result)
    )
    SELECT *
    FROM Filtered
    ORDER BY SubmitTime DESC
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO
