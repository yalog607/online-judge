CREATE OR ALTER PROCEDURE app.usp_Class_GetStudentProgressDetail
    @ClassID INT,
    @StudentID INT,
    @ActorID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID)
    BEGIN
        THROW 50031, 'Lop hoc khong ton tai.', 1;
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @ClassID AND UserID = @StudentID)
    BEGIN
        THROW 50032, 'Sinh vien khong thuoc lop hoc nay.', 1;
    END;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin'
        UNION ALL
        SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND TeacherID = @ActorID
        UNION ALL
        SELECT 1 FROM dbo.Class_TA WHERE ClassID = @ClassID AND UserID_TA = @ActorID
        UNION ALL
        SELECT 1 WHERE @ActorID = @StudentID
    )
    BEGIN
        THROW 50030, 'Ban khong co quyen xem chi tiet tien do cua sinh vien nay.', 1;
    END;

    DECLARE @TotalProblems INT;
    SELECT @TotalProblems = COUNT(*) FROM dbo.Class_Problem WHERE ClassID = @ClassID;

    DECLARE @SolvedProblems INT;
    SELECT @SolvedProblems = COUNT(DISTINCT cp.ProblemID)
    FROM dbo.Class_Problem cp
    WHERE cp.ClassID = @ClassID
      AND EXISTS (
          SELECT 1 FROM dbo.Submissions s
          WHERE s.UserID = @StudentID
            AND s.ProblemID = cp.ProblemID
            AND s.Result = 'AC'
      );

    DECLARE @AttemptedProblems INT;
    SELECT @AttemptedProblems = COUNT(DISTINCT cp.ProblemID)
    FROM dbo.Class_Problem cp
    WHERE cp.ClassID = @ClassID
      AND NOT EXISTS (
          SELECT 1 FROM dbo.Submissions s
          WHERE s.UserID = @StudentID
            AND s.ProblemID = cp.ProblemID
            AND s.Result = 'AC'
      )
      AND EXISTS (
          SELECT 1 FROM dbo.Submissions s
          WHERE s.UserID = @StudentID
            AND s.ProblemID = cp.ProblemID
      );

    DECLARE @UnattemptedProblems INT = @TotalProblems - (@SolvedProblems + @AttemptedProblems);
    IF @UnattemptedProblems < 0 SET @UnattemptedProblems = 0;

    DECLARE @CalculatedProgress FLOAT = 0.0;
    IF @TotalProblems > 0
    BEGIN
        SET @CalculatedProgress = ROUND(CAST(@SolvedProblems AS FLOAT) * 100.0 / @TotalProblems, 1);
        UPDATE dbo.Class_Student
        SET ProgressPercent = @CalculatedProgress
        WHERE ClassID = @ClassID AND UserID = @StudentID;
    END;

    SELECT 
        u.UserID,
        u.FullName,
        u.Username,
        u.Email,
        cs.JoinDate,
        @CalculatedProgress AS ProgressPercent,
        @TotalProblems AS TotalProblems,
        @SolvedProblems AS SolvedProblems,
        @AttemptedProblems AS AttemptedProblems,
        @UnattemptedProblems AS UnattemptedProblems,
        ISNULL((
            SELECT COUNT(*) 
            FROM dbo.Submissions s
            JOIN dbo.Class_Problem cp ON cp.ClassID = @ClassID AND cp.ProblemID = s.ProblemID
            WHERE s.UserID = @StudentID
        ), 0) AS TotalSubmissions,
        ISNULL((
            SELECT COUNT(*) 
            FROM dbo.Submissions s
            JOIN dbo.Class_Problem cp ON cp.ClassID = @ClassID AND cp.ProblemID = s.ProblemID
            WHERE s.UserID = @StudentID AND s.Result = 'AC'
        ), 0) AS TotalAC
    FROM dbo.Users u
    JOIN dbo.Class_Student cs ON cs.UserID = u.UserID AND cs.ClassID = @ClassID
    WHERE u.UserID = @StudentID;

    SELECT 
        p.ProblemID,
        p.Title,
        p.Difficulty,
        p.TimeLimit,
        p.MemoryLimit,
        cp.AssignedDate,
        cp.DueDate,
        cp.IsClosed,
        CASE 
            WHEN EXISTS (SELECT 1 FROM dbo.Submissions s WHERE s.UserID = @StudentID AND s.ProblemID = p.ProblemID AND s.Result = 'AC')
                THEN 'Solved'
            WHEN EXISTS (SELECT 1 FROM dbo.Submissions s WHERE s.UserID = @StudentID AND s.ProblemID = p.ProblemID)
                THEN 'Attempted'
            ELSE 'Unattempted'
        END AS Status,
        (
            SELECT TOP 1 s.Result
            FROM dbo.Submissions s
            WHERE s.UserID = @StudentID AND s.ProblemID = p.ProblemID
            ORDER BY CASE WHEN s.Result = 'AC' THEN 0 ELSE 1 END, s.SubmitTime DESC
        ) AS BestResult,
        (
            SELECT COUNT(*)
            FROM dbo.Submissions s
            WHERE s.UserID = @StudentID AND s.ProblemID = p.ProblemID
        ) AS SubmissionCount,
        (
            SELECT MAX(s.SubmitTime)
            FROM dbo.Submissions s
            WHERE s.UserID = @StudentID AND s.ProblemID = p.ProblemID
        ) AS LastSubmitTime
    FROM dbo.Class_Problem cp
    JOIN dbo.Problems p ON p.ProblemID = cp.ProblemID
    WHERE cp.ClassID = @ClassID
    ORDER BY cp.AssignedDate ASC, p.ProblemID ASC;

    SELECT TOP 50
        s.SubmissionID,
        s.ProblemID,
        p.Title AS ProblemTitle,
        s.Language,
        s.Result,
        s.Runtime,
        s.Memory,
        s.PassedCases,
        s.SubmitTime
    FROM dbo.Submissions s
    JOIN dbo.Class_Problem cp ON cp.ClassID = @ClassID AND cp.ProblemID = s.ProblemID
    JOIN dbo.Problems p ON p.ProblemID = s.ProblemID
    WHERE s.UserID = @StudentID
    ORDER BY s.SubmitTime DESC;
END;
GO
