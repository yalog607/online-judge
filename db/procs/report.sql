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
        THROW 50030, 'Ban khong co quyen xem thong ke cua lop nay.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID)
        THROW 50025, 'Lop hoc khong ton tai.', 1;

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
        THROW 50030, 'Ban khong co quyen xem thong ke cua ky thi nay.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Contests WHERE ContestID = @ContestID)
        THROW 50027, 'Ky thi khong ton tai.', 1;

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

