CREATE OR ALTER PROCEDURE app.usp_Report_GetClassStats
    @ActorID INT,
    @ClassID INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Kiểm tra quyền: Admin, Giáo viên của lớp, hoặc Trợ giảng của lớp
    IF NOT EXISTS (
        SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin'
        UNION ALL
        SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND TeacherID = @ActorID
        UNION ALL
        SELECT 1 FROM dbo.Class_TA WHERE ClassID = @ClassID AND UserID_TA = @ActorID
    )
        THROW 50030, N'Bạn không có quyền xem thống kê của lớp này.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID)
        THROW 50025, N'Lớp học không tồn tại.', 1;

    -- 1. Tổng quan lớp học & tỉ lệ đạt/trượt chung
    SELECT
        c.ClassID,
        c.ClassName,
        t.FullName AS TeacherName,
        (SELECT COUNT(DISTINCT UserID) FROM dbo.Class_Student WHERE ClassID = @ClassID) AS TotalStudents,
        (SELECT COUNT(DISTINCT ProblemID) FROM dbo.Class_Problem WHERE ClassID = @ClassID) AS TotalProblems,
        COUNT(s.SubmissionID) AS TotalSubmissions,
        COUNT(CASE WHEN s.Result = 'AC' THEN 1 END) AS TotalAC,
        COUNT(CASE WHEN s.Result = 'WA' THEN 1 END) AS TotalWA,
        COUNT(CASE WHEN s.Result = 'TLE' THEN 1 END) AS TotalTLE,
        COUNT(CASE WHEN s.Result = 'MLE' THEN 1 END) AS TotalMLE,
        COUNT(CASE WHEN s.Result = 'RE' THEN 1 END) AS TotalRE,
        COUNT(CASE WHEN s.Result = 'CE' THEN 1 END) AS TotalCE,
        COUNT(CASE WHEN s.Result NOT IN ('AC', 'Pending', 'Judging') THEN 1 END) AS TotalFailed,
        CASE
            WHEN COUNT(s.SubmissionID) > 0
            THEN ROUND(100.0 * COUNT(CASE WHEN s.Result = 'AC' THEN 1 END) / COUNT(s.SubmissionID), 1)
            ELSE 0
        END AS PassRatePercent
    FROM dbo.Classes c
    JOIN dbo.Users t ON t.UserID = c.TeacherID
    LEFT JOIN dbo.Class_Student cs ON cs.ClassID = c.ClassID
    LEFT JOIN dbo.Class_Problem cp ON cp.ClassID = c.ClassID
    LEFT JOIN dbo.Submissions s ON s.UserID = cs.UserID AND s.ProblemID = cp.ProblemID AND s.Result NOT IN ('Pending', 'Judging')
    WHERE c.ClassID = @ClassID
    GROUP BY c.ClassID, c.ClassName, t.FullName;

    -- 2. Thống kê theo từng bài tập trong lớp
    SELECT
        p.ProblemID,
        p.Title,
        p.Difficulty,
        COUNT(s.SubmissionID) AS TotalSubmissions,
        COUNT(CASE WHEN s.Result = 'AC' THEN 1 END) AS TotalAC,
        COUNT(CASE WHEN s.Result NOT IN ('AC', 'Pending', 'Judging') THEN 1 END) AS TotalFailed,
        CASE
            WHEN COUNT(s.SubmissionID) > 0
            THEN ROUND(100.0 * COUNT(CASE WHEN s.Result = 'AC' THEN 1 END) / COUNT(s.SubmissionID), 1)
            ELSE 0
        END AS PassRatePercent,
        COUNT(DISTINCT CASE WHEN s.Result = 'AC' THEN s.UserID END) AS SolvedStudentCount
    FROM dbo.Class_Problem cp
    JOIN dbo.Problems p ON p.ProblemID = cp.ProblemID
    LEFT JOIN dbo.Class_Student cs ON cs.ClassID = cp.ClassID
    LEFT JOIN dbo.Submissions s ON s.ProblemID = p.ProblemID AND s.UserID = cs.UserID AND s.Result NOT IN ('Pending', 'Judging')
    WHERE cp.ClassID = @ClassID
    GROUP BY p.ProblemID, p.Title, p.Difficulty
    ORDER BY p.ProblemID ASC;

    -- 3. Thống kê theo từng học sinh trong lớp
    SELECT
        u.UserID,
        u.FullName,
        u.Username,
        u.Email,
        cs.ProgressPercent,
        COUNT(s.SubmissionID) AS TotalSubmissions,
        COUNT(CASE WHEN s.Result = 'AC' THEN 1 END) AS TotalAC,
        COUNT(CASE WHEN s.Result NOT IN ('AC', 'Pending', 'Judging') THEN 1 END) AS TotalFailed,
        COUNT(DISTINCT CASE WHEN s.Result = 'AC' THEN s.ProblemID END) AS ProblemsSolved,
        CASE
            WHEN COUNT(s.SubmissionID) > 0
            THEN ROUND(100.0 * COUNT(CASE WHEN s.Result = 'AC' THEN 1 END) / COUNT(s.SubmissionID), 1)
            ELSE 0
        END AS PassRatePercent
    FROM dbo.Class_Student cs
    JOIN dbo.Users u ON u.UserID = cs.UserID
    LEFT JOIN dbo.Class_Problem cp ON cp.ClassID = cs.ClassID
    LEFT JOIN dbo.Submissions s ON s.UserID = u.UserID AND s.ProblemID = cp.ProblemID AND s.Result NOT IN ('Pending', 'Judging')
    WHERE cs.ClassID = @ClassID
    GROUP BY u.UserID, u.FullName, u.Username, u.Email, cs.ProgressPercent
    ORDER BY ProblemsSolved DESC, PassRatePercent DESC;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Report_GetContestStats
    @ActorID INT,
    @ContestID INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Kiểm tra quyền: Admin hoặc Người tạo kỳ thi
    IF NOT EXISTS (
        SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin'
        UNION ALL
        SELECT 1 FROM dbo.Contests WHERE ContestID = @ContestID AND CreatorID = @ActorID
    )
        THROW 50030, N'Bạn không có quyền xem thống kê của kỳ thi này.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Contests WHERE ContestID = @ContestID)
        THROW 50027, N'Kỳ thi không tồn tại.', 1;

    -- 1. Tổng quan kỳ thi & tỉ lệ đạt/trượt chung
    SELECT
        c.ContestID,
        c.ContestName,
        c.StartTime,
        c.EndTime,
        (SELECT COUNT(DISTINCT UserID) FROM dbo.Contest_User WHERE ContestID = @ContestID) AS TotalParticipants,
        (SELECT COUNT(DISTINCT ProblemID) FROM dbo.Contest_Problem WHERE ContestID = @ContestID) AS TotalProblems,
        COUNT(s.SubmissionID) AS TotalSubmissions,
        COUNT(CASE WHEN s.Result = 'AC' THEN 1 END) AS TotalAC,
        COUNT(CASE WHEN s.Result = 'WA' THEN 1 END) AS TotalWA,
        COUNT(CASE WHEN s.Result = 'TLE' THEN 1 END) AS TotalTLE,
        COUNT(CASE WHEN s.Result = 'MLE' THEN 1 END) AS TotalMLE,
        COUNT(CASE WHEN s.Result = 'RE' THEN 1 END) AS TotalRE,
        COUNT(CASE WHEN s.Result = 'CE' THEN 1 END) AS TotalCE,
        COUNT(CASE WHEN s.Result NOT IN ('AC', 'Pending', 'Judging') THEN 1 END) AS TotalFailed,
        CASE
            WHEN COUNT(s.SubmissionID) > 0
            THEN ROUND(100.0 * COUNT(CASE WHEN s.Result = 'AC' THEN 1 END) / COUNT(s.SubmissionID), 1)
            ELSE 0
        END AS PassRatePercent
    FROM dbo.Contests c
    LEFT JOIN dbo.Submissions s ON s.ContestID = c.ContestID AND s.Result NOT IN ('Pending', 'Judging')
    WHERE c.ContestID = @ContestID
    GROUP BY c.ContestID, c.ContestName, c.StartTime, c.EndTime;

    -- 2. Thống kê theo từng bài tập trong kỳ thi
    SELECT
        p.ProblemID,
        p.Title,
        cp.MaxScore,
        COUNT(s.SubmissionID) AS TotalSubmissions,
        COUNT(CASE WHEN s.Result = 'AC' THEN 1 END) AS TotalAC,
        COUNT(CASE WHEN s.Result NOT IN ('AC', 'Pending', 'Judging') THEN 1 END) AS TotalFailed,
        CASE
            WHEN COUNT(s.SubmissionID) > 0
            THEN ROUND(100.0 * COUNT(CASE WHEN s.Result = 'AC' THEN 1 END) / COUNT(s.SubmissionID), 1)
            ELSE 0
        END AS PassRatePercent,
        COUNT(DISTINCT CASE WHEN s.Result = 'AC' THEN s.UserID END) AS SolvedParticipantCount
    FROM dbo.Contest_Problem cp
    JOIN dbo.Problems p ON p.ProblemID = cp.ProblemID
    LEFT JOIN dbo.Submissions s ON s.ProblemID = cp.ProblemID AND s.ContestID = cp.ContestID AND s.Result NOT IN ('Pending', 'Judging')
    WHERE cp.ContestID = @ContestID
    GROUP BY p.ProblemID, p.Title, cp.MaxScore
    ORDER BY cp.MaxScore DESC, p.ProblemID ASC;

    -- 3. Thống kê theo từng thí sinh trong kỳ thi
    SELECT
        u.UserID,
        u.FullName,
        u.Username,
        u.Email,
        cu.TotalScore,
        cu.PenaltyTime,
        COUNT(s.SubmissionID) AS TotalSubmissions,
        COUNT(CASE WHEN s.Result = 'AC' THEN 1 END) AS TotalAC,
        COUNT(CASE WHEN s.Result NOT IN ('AC', 'Pending', 'Judging') THEN 1 END) AS TotalFailed,
        COUNT(DISTINCT CASE WHEN s.Result = 'AC' THEN s.ProblemID END) AS ProblemsSolved,
        CASE
            WHEN COUNT(s.SubmissionID) > 0
            THEN ROUND(100.0 * COUNT(CASE WHEN s.Result = 'AC' THEN 1 END) / COUNT(s.SubmissionID), 1)
            ELSE 0
        END AS PassRatePercent
    FROM dbo.Contest_User cu
    JOIN dbo.Users u ON u.UserID = cu.UserID
    LEFT JOIN dbo.Submissions s ON s.UserID = cu.UserID AND s.ContestID = cu.ContestID AND s.Result NOT IN ('Pending', 'Judging')
    WHERE cu.ContestID = @ContestID
    GROUP BY u.UserID, u.FullName, u.Username, u.Email, cu.TotalScore, cu.PenaltyTime
    ORDER BY cu.TotalScore DESC, cu.PenaltyTime ASC;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Report_ListClasses
    @ActorID INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IsAdmin BIT = 0;
    IF EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin')
        SET @IsAdmin = 1;

    SELECT
        c.ClassID,
        c.ClassName,
        t.FullName AS TeacherName,
        c.ApprovalStatus,
        (SELECT COUNT(DISTINCT UserID) FROM dbo.Class_Student WHERE ClassID = c.ClassID) AS StudentCount,
        (SELECT COUNT(DISTINCT ProblemID) FROM dbo.Class_Problem WHERE ClassID = c.ClassID) AS ProblemCount
    FROM dbo.Classes c
    JOIN dbo.Users t ON t.UserID = c.TeacherID
    WHERE
        @IsAdmin = 1
        OR c.TeacherID = @ActorID
        OR EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = c.ClassID AND UserID_TA = @ActorID)
    ORDER BY c.ClassID DESC;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Report_ListContests
    @ActorID INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IsAdmin BIT = 0;
    IF EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin')
        SET @IsAdmin = 1;

    SELECT
        c.ContestID,
        c.ContestName,
        u.FullName AS CreatorName,
        c.StartTime,
        c.EndTime,
        CASE
            WHEN SYSUTCDATETIME() < c.StartTime THEN 'Upcoming'
            WHEN SYSUTCDATETIME() > c.EndTime THEN 'Ended'
            ELSE 'Ongoing'
        END AS Status,
        (SELECT COUNT(DISTINCT UserID) FROM dbo.Contest_User WHERE ContestID = c.ContestID) AS ParticipantCount,
        (SELECT COUNT(DISTINCT ProblemID) FROM dbo.Contest_Problem WHERE ContestID = c.ContestID) AS ProblemCount
    FROM dbo.Contests c
    JOIN dbo.Users u ON u.UserID = c.CreatorID
    WHERE
        @IsAdmin = 1
        OR c.CreatorID = @ActorID
    ORDER BY c.ContestID DESC;
END;
GO

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

