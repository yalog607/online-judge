-- Dashboard "Tổng quan" theo vai trò. Ngày/giờ hiển thị tính theo giờ Việt Nam (UTC+7).

CREATE OR ALTER PROCEDURE app.usp_Dashboard_User
    @UserID INT,
    @SummaryOnly BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Now DATETIME2(0) = SYSUTCDATETIME();
    DECLARE @Today DATE = CAST(DATEADD(HOUR, 7, @Now) AS DATE);
    DECLARE @Solved INT, @SolvedWeek INT, @Total INT, @AC INT;
    DECLARE @Current INT = 0, @Longest INT = 0;

    SELECT @Total = COUNT(*),
           @AC = ISNULL(SUM(CASE WHEN Result = 'AC' THEN 1 ELSE 0 END), 0)
    FROM dbo.Submissions WHERE UserID = @UserID;

    SELECT @Solved = COUNT(*),
           @SolvedWeek = ISNULL(SUM(CASE WHEN FirstAc >= DATEADD(DAY, -7, @Now) THEN 1 ELSE 0 END), 0)
    FROM (
        SELECT ProblemID, MIN(SubmitTime) AS FirstAc
        FROM dbo.Submissions
        WHERE UserID = @UserID AND Result = 'AC'
        GROUP BY ProblemID
    ) f;

    -- Chuỗi ngày liên tiếp có nộp bài (gaps-and-islands).
    ;WITH Days AS (
        SELECT DISTINCT CAST(DATEADD(HOUR, 7, SubmitTime) AS DATE) AS D
        FROM dbo.Submissions WHERE UserID = @UserID
    ), Grouped AS (
        SELECT D, DATEADD(DAY, -ROW_NUMBER() OVER (ORDER BY D), D) AS Grp FROM Days
    ), Islands AS (
        SELECT COUNT(*) AS Len, MAX(D) AS EndDay FROM Grouped GROUP BY Grp
    )
    SELECT @Longest = ISNULL(MAX(Len), 0),
           @Current = ISNULL(MAX(CASE WHEN EndDay >= DATEADD(DAY, -1, @Today) THEN Len END), 0)
    FROM Islands;

    SELECT
        @Solved AS ProblemsSolved,
        @SolvedWeek AS SolvedThisWeek,
        @Total AS TotalSubmissions,
        @AC AS TotalAC,
        @Current AS CurrentStreak,
        @Longest AS LongestStreak,
        CONVERT(VARCHAR(10), @Today, 23) AS Today;

    IF @SummaryOnly = 1 RETURN; -- chỉ dùng cho kiểm thử

    -- Hoạt động theo ngày (dùng cho heatmap 26 tuần).
    SELECT CONVERT(VARCHAR(10), CAST(DATEADD(HOUR, 7, SubmitTime) AS DATE), 23) AS [Day],
           COUNT(*) AS Cnt
    FROM dbo.Submissions
    WHERE UserID = @UserID
      AND SubmitTime >= DATEADD(DAY, -200, @Now)
    GROUP BY CAST(DATEADD(HOUR, 7, SubmitTime) AS DATE);

    -- Kỳ thi đang/sắp diễn ra gần nhất mà người dùng được phép thấy.
    SELECT TOP 1
        co.ContestID, co.ContestName, co.StartTime, co.EndTime,
        co.ProblemCount, co.IsProtected, co.[Status]
    FROM app.uvw_ContestOverview co
    WHERE co.[Status] IN ('Ongoing', 'Upcoming')
      AND (
          co.CreatorID = @UserID
          OR EXISTS (SELECT 1 FROM dbo.Contest_User cu WHERE cu.ContestID = co.ContestID AND cu.UserID = @UserID)
          OR co.ClassID IS NULL
          OR EXISTS (SELECT 1 FROM dbo.Classes c WHERE c.ClassID = co.ClassID AND c.TeacherID = @UserID)
          OR EXISTS (SELECT 1 FROM dbo.Class_Student cs WHERE cs.ClassID = co.ClassID AND cs.UserID = @UserID)
          OR EXISTS (SELECT 1 FROM dbo.Class_TA ta WHERE ta.ClassID = co.ClassID AND ta.UserID_TA = @UserID)
      )
    ORDER BY CASE WHEN co.[Status] = 'Ongoing' THEN 0 ELSE 1 END, co.StartTime ASC;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Dashboard_Teacher
    @TeacherID INT,
    @SummaryOnly BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Now DATETIME2(0) = SYSUTCDATETIME();
    DECLARE @Today DATE = CAST(DATEADD(HOUR, 7, @Now) AS DATE);

    CREATE TABLE #MyClasses (ClassID INT PRIMARY KEY);
    INSERT #MyClasses (ClassID)
    SELECT ClassID FROM dbo.Classes
    WHERE TeacherID = @TeacherID AND ApprovalStatus = 'Approved' AND IsCancelled = 0;

    -- Bài nộp của học viên trong các lớp của giảng viên, trên bài được giao cho lớp đó.
    CREATE TABLE #Subs (SubmissionID INT PRIMARY KEY, SubDay DATE NOT NULL);
    INSERT #Subs (SubmissionID, SubDay)
    SELECT s.SubmissionID, CAST(DATEADD(HOUR, 7, s.SubmitTime) AS DATE)
    FROM dbo.Submissions s
    WHERE s.SubmitTime >= DATEADD(DAY, -8, @Now)
      AND EXISTS (
          SELECT 1
          FROM #MyClasses mc
          JOIN dbo.Class_Student cs ON cs.ClassID = mc.ClassID AND cs.UserID = s.UserID
          JOIN dbo.Class_Problem cp ON cp.ClassID = mc.ClassID AND cp.ProblemID = s.ProblemID AND s.ClassID = mc.ClassID
      );

    SELECT
        (SELECT COUNT(*) FROM #MyClasses) AS ClassCount,
        (SELECT COUNT(DISTINCT cs.UserID) FROM dbo.Class_Student cs JOIN #MyClasses mc ON mc.ClassID = cs.ClassID) AS StudentCount,
        (SELECT COUNT(*) FROM dbo.Class_Problem cp JOIN #MyClasses mc ON mc.ClassID = cp.ClassID
          WHERE cp.IsClosed = 0 AND (cp.DueDate IS NULL OR cp.DueDate >= @Now)) AS OpenProblems,
        (SELECT COUNT(*) FROM dbo.Class_Problem cp JOIN #MyClasses mc ON mc.ClassID = cp.ClassID
          WHERE cp.IsClosed = 0 AND cp.DueDate >= @Now AND cp.DueDate <= DATEADD(DAY, 3, @Now)) AS ExpiringSoon,
        (SELECT COUNT(*) FROM #Subs WHERE SubDay = @Today) AS SubmissionsToday,
        (SELECT COUNT(*) FROM #Subs WHERE SubDay = DATEADD(DAY, -1, @Today)) AS SubmissionsYesterday,
        (SELECT COUNT(*) FROM dbo.Classes WHERE TeacherID = @TeacherID AND ApprovalStatus = 'Pending' AND IsCancelled = 0) AS PendingClasses,
        (SELECT COUNT(*) FROM dbo.Problems WHERE CreatorID = @TeacherID AND Status = 'Pending') AS PendingProblems,
        (SELECT COUNT(*) FROM dbo.TA_Requests WHERE RequestedBy = @TeacherID AND Status = 'Pending') AS PendingTaRequests,
        CONVERT(VARCHAR(10), @Today, 23) AS Today;

    IF @SummaryOnly = 1 RETURN; -- chỉ dùng cho kiểm thử

    -- Bài nộp 7 ngày gần nhất theo ngày.
    SELECT CONVERT(VARCHAR(10), SubDay, 23) AS [Day], COUNT(*) AS Cnt
    FROM #Subs
    WHERE SubDay >= DATEADD(DAY, -6, @Today)
    GROUP BY SubDay;

    -- Bài nộp mới nhất của học viên.
    SELECT TOP 5
        s.SubmissionID, u.FullName, p.Title AS ProblemTitle, s.Result, s.SubmitTime
    FROM dbo.Submissions s
    JOIN dbo.Users u ON u.UserID = s.UserID
    JOIN dbo.Problems p ON p.ProblemID = s.ProblemID
    WHERE EXISTS (
        SELECT 1
        FROM #MyClasses mc
        JOIN dbo.Class_Student cs ON cs.ClassID = mc.ClassID AND cs.UserID = s.UserID
        JOIN dbo.Class_Problem cp ON cp.ClassID = mc.ClassID AND cp.ProblemID = s.ProblemID AND s.ClassID = mc.ClassID
    )
    ORDER BY s.SubmitTime DESC, s.SubmissionID DESC;

    -- Tiến độ từng lớp.
    SELECT TOP 8
        c.ClassID,
        c.ClassName,
        (SELECT COUNT(*) FROM dbo.Class_Student cs WHERE cs.ClassID = c.ClassID) AS StudentCount,
        (SELECT ISNULL(ROUND(AVG(cs.ProgressPercent), 0), 0) FROM dbo.Class_Student cs WHERE cs.ClassID = c.ClassID) AS AvgProgress,
        (SELECT MIN(cp.DueDate) FROM dbo.Class_Problem cp
          WHERE cp.ClassID = c.ClassID AND cp.IsClosed = 0 AND cp.DueDate >= @Now) AS NextDue
    FROM dbo.Classes c
    JOIN #MyClasses mc ON mc.ClassID = c.ClassID
    ORDER BY c.CreatedAt DESC, c.ClassID DESC;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Dashboard_Admin
    @SummaryOnly BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Now DATETIME2(0) = SYSUTCDATETIME();
    DECLARE @TodayStartUtc DATETIME2(0) =
        DATEADD(HOUR, -7, CAST(CAST(DATEADD(HOUR, 7, @Now) AS DATE) AS DATETIME2(0)));

    SELECT
        (SELECT COUNT(*) FROM dbo.Users) AS TotalUsers,
        (SELECT COUNT(*) FROM dbo.Users WHERE CreatedAt >= @TodayStartUtc) AS NewUsersToday,
        (SELECT COUNT(*) FROM dbo.Submissions WHERE SubmitTime >= DATEADD(HOUR, -24, @Now)) AS Submissions24h,
        (SELECT COUNT(*) FROM dbo.Submissions
          WHERE SubmitTime >= DATEADD(HOUR, -48, @Now) AND SubmitTime < DATEADD(HOUR, -24, @Now)) AS SubmissionsPrev24h,
        (SELECT COUNT(*) FROM dbo.Submissions WHERE Result IN ('Pending', 'Judging')) AS QueueCount,
        (SELECT COUNT(*) FROM dbo.JudgeWorkers WHERE LastSeenAt >= DATEADD(HOUR, -1, @Now)) AS WorkersTotal,
        (SELECT COUNT(*) FROM dbo.JudgeWorkers WHERE LastSeenAt >= DATEADD(SECOND, -45, @Now)) AS WorkersActive,
        (SELECT COUNT(*) FROM dbo.Submissions
          WHERE Result = 'IE' AND SubmitTime >= DATEADD(HOUR, -24, @Now)) AS Errors24h;

    IF @SummaryOnly = 1 RETURN; -- chỉ dùng cho kiểm thử

    -- 24 giờ gần nhất, mỗi giờ một mốc (0 = cũ nhất, 23 = giờ hiện tại), giờ theo UTC+7.
    DECLARE @Epoch DATETIME2(0) = '2000-01-01';
    DECLARE @CurrentHour DATETIME2(0) = DATEADD(HOUR, DATEDIFF(HOUR, @Epoch, @Now), @Epoch);
    SELECT
        b.Idx,
        DATEPART(HOUR, DATEADD(HOUR, 7, DATEADD(HOUR, b.Idx - 23, @CurrentHour))) AS StartHour,
        (SELECT COUNT(*) FROM dbo.Submissions s
          WHERE s.SubmitTime >= DATEADD(HOUR, b.Idx - 23, @CurrentHour)
            AND s.SubmitTime < DATEADD(HOUR, b.Idx - 22, @CurrentHour)) AS Cnt
    FROM (SELECT TOP (24) CAST(ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1 AS INT) AS Idx
          FROM sys.all_objects) b
    ORDER BY b.Idx;

    -- Ngôn ngữ dùng trong 30 ngày gần nhất.
    SELECT Language, COUNT(*) AS Cnt
    FROM dbo.Submissions
    WHERE SubmitTime >= DATEADD(DAY, -30, @Now)
    GROUP BY Language
    ORDER BY COUNT(*) DESC;

    -- Hoạt động quản trị gần đây.
    SELECT TOP 8
        a.AuditID, a.Action, a.TargetType, a.TargetID, a.Detail, a.CreatedAt,
        ISNULL(u.FullName, N'Không xác định') AS ActorName,
        t.FullName AS TargetName
    FROM dbo.AuditLog a
    LEFT JOIN dbo.Users u ON u.UserID = a.ActorID
    LEFT JOIN dbo.Users t ON a.TargetType = 'User' AND t.UserID = a.TargetID
    ORDER BY a.CreatedAt DESC, a.AuditID DESC;
END
GO

-- Toàn bộ hoạt động quản trị (nhật ký kiểm toán) có phân trang, mới nhất trước.
CREATE OR ALTER PROCEDURE app.usp_Admin_ListAudit
    @ActorID INT,
    @Page INT = 1,
    @PageSize INT = 30
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin')
        THROW 50031, N'Bạn không có quyền truy cập.', 1;

    IF @Page < 1 SET @Page = 1;
    IF @PageSize < 1 SET @PageSize = 30;
    IF @PageSize > 100 SET @PageSize = 100;

    SELECT
        a.AuditID, a.Action, a.TargetType, a.TargetID, a.Detail, a.CreatedAt,
        ISNULL(u.FullName, N'Không xác định') AS ActorName,
        t.FullName AS TargetName,
        COUNT(*) OVER () AS TotalCount
    FROM dbo.AuditLog a
    LEFT JOIN dbo.Users u ON u.UserID = a.ActorID
    LEFT JOIN dbo.Users t ON a.TargetType = 'User' AND t.UserID = a.TargetID
    ORDER BY a.CreatedAt DESC, a.AuditID DESC
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO
