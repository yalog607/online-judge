CREATE OR ALTER PROCEDURE app.usp_Report_GetUserPersonalProgress
    @TargetUserID INT,
    @ActorID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @TargetUserID)
    BEGIN
        THROW 50031, 'Nguoi dung khong ton tai.', 1;
    END;

    IF NOT EXISTS (
        SELECT 1 WHERE @ActorID = @TargetUserID
        UNION ALL
        SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role IN ('Admin', 'Teacher')
    )
    BEGIN
        THROW 50030, 'Ban khong co quyen xem bao cao tien do cua nguoi dung nay.', 1;
    END;

    DECLARE @TotalSolved INT;
    SELECT @TotalSolved = COUNT(DISTINCT s.ProblemID)
    FROM dbo.Submissions s
    JOIN dbo.Problems p ON p.ProblemID = s.ProblemID
    WHERE s.UserID = @TargetUserID AND s.Result = 'AC' AND p.Status = 'Public';

    DECLARE @TotalSystemProblems INT;
    SELECT @TotalSystemProblems = COUNT(*) FROM dbo.Problems WHERE Status = 'Public';

    DECLARE @TotalSubmissions INT;
    DECLARE @TotalACSubmissions INT;
    SELECT 
        @TotalSubmissions = COUNT(*),
        @TotalACSubmissions = COUNT(CASE WHEN Result = 'AC' THEN 1 END)
    FROM dbo.Submissions
    WHERE UserID = @TargetUserID;

    DECLARE @PassRatePercent FLOAT = 0.0;
    IF @TotalSubmissions > 0
    BEGIN
        SET @PassRatePercent = ROUND(CAST(@TotalACSubmissions AS FLOAT) * 100.0 / @TotalSubmissions, 1);
    END;

    DECLARE @EnrolledClassCount INT;
    SELECT @EnrolledClassCount = COUNT(*) FROM dbo.Class_Student WHERE UserID = @TargetUserID;

    DECLARE @ContestCount INT;
    SELECT @ContestCount = COUNT(*) FROM dbo.Contest_User WHERE UserID = @TargetUserID;

    SELECT 
        u.UserID,
        u.FullName,
        u.Username,
        u.Email,
        u.Avatar,
        u.Role,
        u.CreatedAt,
        @TotalSolved AS TotalSolved,
        @TotalSystemProblems AS TotalSystemProblems,
        @TotalSubmissions AS TotalSubmissions,
        @TotalACSubmissions AS TotalACSubmissions,
        @PassRatePercent AS PassRatePercent,
        @EnrolledClassCount AS EnrolledClassCount,
        @ContestCount AS ContestCount
    FROM dbo.Users u
    WHERE u.UserID = @TargetUserID;

    SELECT 
        d.Difficulty,
        ISNULL(solved.SolvedCount, 0) AS SolvedCount,
        ISNULL(total.TotalCount, 0) AS TotalCount
    FROM (VALUES ('Easy'), ('Medium'), ('Hard')) AS d(Difficulty)
    LEFT JOIN (
        SELECT p.Difficulty, COUNT(*) AS TotalCount
        FROM dbo.Problems p
        WHERE p.Status = 'Public'
        GROUP BY p.Difficulty
    ) AS total ON total.Difficulty = d.Difficulty
    LEFT JOIN (
        SELECT p.Difficulty, COUNT(DISTINCT s.ProblemID) AS SolvedCount
        FROM dbo.Submissions s
        JOIN dbo.Problems p ON p.ProblemID = s.ProblemID
        WHERE s.UserID = @TargetUserID AND s.Result = 'AC' AND p.Status = 'Public'
        GROUP BY p.Difficulty
    ) AS solved ON solved.Difficulty = d.Difficulty
    ORDER BY 
        CASE d.Difficulty
            WHEN 'Easy' THEN 1
            WHEN 'Medium' THEN 2
            WHEN 'Hard' THEN 3
            ELSE 4
        END;

    SELECT TOP 10
        TRIM(tag.value) AS Tag,
        COUNT(DISTINCT s.ProblemID) AS SolvedCount
    FROM dbo.Submissions s
    JOIN dbo.Problems p ON p.ProblemID = s.ProblemID
    CROSS APPLY STRING_SPLIT(p.Tags, ',') AS tag
    WHERE s.UserID = @TargetUserID 
      AND s.Result = 'AC'
      AND p.Status = 'Public'
      AND LEN(TRIM(tag.value)) > 0
    GROUP BY TRIM(tag.value)
    ORDER BY SolvedCount DESC;

    SELECT 
        CAST(s.SubmitTime AS DATE) AS SubmitDate,
        COUNT(*) AS TotalSubmissions,
        COUNT(CASE WHEN s.Result = 'AC' THEN 1 END) AS ACSubmissions
    FROM dbo.Submissions s
    WHERE s.UserID = @TargetUserID
      AND s.SubmitTime >= DATEADD(DAY, -30, SYSUTCDATETIME())
    GROUP BY CAST(s.SubmitTime AS DATE)
    ORDER BY SubmitDate ASC;

    SELECT TOP 15
        s.SubmissionID,
        s.ProblemID,
        p.Title AS ProblemTitle,
        s.Language,
        s.Result,
        s.Runtime,
        s.Memory,
        s.SubmitTime
    FROM dbo.Submissions s
    JOIN dbo.Problems p ON p.ProblemID = s.ProblemID
    WHERE s.UserID = @TargetUserID
    ORDER BY s.SubmitTime DESC;

    SELECT 
        c.ClassID,
        c.ClassName,
        t.FullName AS TeacherName,
        cs.ProgressPercent,
        cs.JoinDate,
        (
            SELECT COUNT(DISTINCT cp.ProblemID)
            FROM dbo.Class_Problem cp
            WHERE cp.ClassID = c.ClassID
              AND EXISTS (
                  SELECT 1 FROM dbo.Submissions s
                  WHERE s.UserID = @TargetUserID AND s.ProblemID = cp.ProblemID AND s.Result = 'AC'
              )
        ) AS SolvedCount,
        (
            SELECT COUNT(*) FROM dbo.Class_Problem cp WHERE cp.ClassID = c.ClassID
        ) AS TotalProblems
    FROM dbo.Class_Student cs
    JOIN dbo.Classes c ON c.ClassID = cs.ClassID
    JOIN dbo.Users t ON t.UserID = c.TeacherID
    WHERE cs.UserID = @TargetUserID AND c.IsCancelled = 0
    ORDER BY cs.JoinDate DESC;
END;
GO
