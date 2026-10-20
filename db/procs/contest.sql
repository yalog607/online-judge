CREATE OR ALTER PROCEDURE app.usp_Contest_Create
    @CreatorID INT,
    @ContestName NVARCHAR(200),
    @Description NVARCHAR(MAX) = NULL,
    @StartTime DATETIME2(0),
    @EndTime DATETIME2(0),
    @Password VARCHAR(255) = NULL,
    @ClassID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 
        FROM dbo.Users 
        WHERE UserID = @CreatorID AND Role IN ('Teacher', 'Admin')
    )
        THROW 50030, N'Chỉ giảng viên hoặc quản trị viên mới có thể tạo kỳ thi.', 1;

    IF @EndTime <= @StartTime
        THROW 50031, N'Thời gian kết thúc phải sau thời gian bắt đầu.', 1;

    IF @ClassID IS NOT NULL AND NOT EXISTS (
        SELECT 1 
        FROM dbo.Classes 
        WHERE ClassID = @ClassID AND IsCancelled = 0 AND ApprovalStatus = 'Approved' AND (TeacherID = @CreatorID OR EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @CreatorID AND Role = 'Admin'))
    )
        THROW 50032, N'Lớp học không tồn tại hoặc bạn không có quyền gán kỳ thi vào lớp học này.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT dbo.Contests (CreatorID, ContestName, Description, StartTime, EndTime, [Password], ClassID)
        VALUES (@CreatorID, TRIM(@ContestName), @Description, @StartTime, @EndTime, NULLIF(TRIM(@Password), ''), @ClassID);

        DECLARE @NewContestID INT = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT @NewContestID AS ContestID;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Contest_Update
    @ContestID INT,
    @RequesterID INT,
    @ContestName NVARCHAR(200),
    @Description NVARCHAR(MAX) = NULL,
    @StartTime DATETIME2(0),
    @EndTime DATETIME2(0),
    @Password VARCHAR(255) = NULL,
    @ClassID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 
        FROM dbo.Contests c
        LEFT JOIN dbo.Users u ON u.UserID = @RequesterID
        WHERE c.ContestID = @ContestID 
          AND (c.CreatorID = @RequesterID OR u.Role = 'Admin')
    )
        THROW 50033, N'Bạn không có quyền cập nhật kỳ thi này.', 1;

    IF @EndTime <= @StartTime
        THROW 50034, N'Thời gian kết thúc phải sau thời gian bắt đầu.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.Contests
        SET ContestName = TRIM(@ContestName),
            Description = @Description,
            StartTime = @StartTime,
            EndTime = @EndTime,
            [Password] = CASE WHEN @Password = '__KEEP__' THEN [Password] ELSE NULLIF(TRIM(@Password), '') END,
            ClassID = @ClassID
        WHERE ContestID = @ContestID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Contest_Get
    @ContestID INT,
    @RequesterID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        co.*,
        CAST(CASE 
            WHEN @RequesterID IS NOT NULL AND EXISTS (
                SELECT 1 FROM dbo.Contest_User cu WHERE cu.ContestID = @ContestID AND cu.UserID = @RequesterID
            ) THEN 1 
            ELSE 0 
        END AS BIT) AS IsJoined
    FROM app.uvw_ContestOverview co
    WHERE co.ContestID = @ContestID
      AND @RequesterID IS NOT NULL
      AND (
          co.CreatorID = @RequesterID
          OR EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @RequesterID AND Role = 'Admin')
          OR EXISTS (SELECT 1 FROM dbo.Contest_User cu WHERE cu.ContestID = @ContestID AND cu.UserID = @RequesterID)
          OR co.ClassID IS NULL
          OR EXISTS (SELECT 1 FROM dbo.Classes c WHERE c.ClassID = co.ClassID AND c.TeacherID = @RequesterID)
          OR EXISTS (SELECT 1 FROM dbo.Class_Student cs WHERE cs.ClassID = co.ClassID AND cs.UserID = @RequesterID)
          OR EXISTS (SELECT 1 FROM dbo.Class_TA ta WHERE ta.ClassID = co.ClassID AND ta.UserID_TA = @RequesterID)
      );
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Contest_List
    @Status VARCHAR(20) = 'All',
    @ClassID INT = NULL,
    @Search NVARCHAR(100) = NULL,
    @Page INT = 1,
    @PageSize INT = 20,
    @UserID INT = NULL,
    @OnlyMine BIT = 0,
    @OnlyJoined BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        co.*,
        COUNT(*) OVER() AS TotalCount
    FROM app.uvw_ContestOverview co
    WHERE (@Status = 'All' OR co.[Status] = @Status)
      AND (@ClassID IS NULL OR co.ClassID = @ClassID)
      AND (
          @Search IS NULL 
          OR co.ContestName LIKE '%' + @Search + '%'
          OR ('KT' + RIGHT('000' + CAST(co.ContestID AS VARCHAR(10)), 3)) LIKE '%' + @Search + '%'
          OR CAST(co.ContestID AS NVARCHAR(20)) = @Search
      )
      AND (@OnlyMine = 0 OR (@UserID IS NOT NULL AND co.CreatorID = @UserID))
      AND (@OnlyJoined = 0 OR (@UserID IS NOT NULL AND EXISTS (
          SELECT 1 FROM dbo.Contest_User cu WHERE cu.ContestID = co.ContestID AND cu.UserID = @UserID
      )))
      AND @UserID IS NOT NULL
      AND (
          co.CreatorID = @UserID
          OR EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role = 'Admin')
          OR EXISTS (SELECT 1 FROM dbo.Contest_User cu WHERE cu.ContestID = co.ContestID AND cu.UserID = @UserID)
          OR co.ClassID IS NULL
          OR EXISTS (SELECT 1 FROM dbo.Classes c WHERE c.ClassID = co.ClassID AND c.TeacherID = @UserID)
          OR EXISTS (SELECT 1 FROM dbo.Class_Student cs WHERE cs.ClassID = co.ClassID AND cs.UserID = @UserID)
          OR EXISTS (SELECT 1 FROM dbo.Class_TA ta WHERE ta.ClassID = co.ClassID AND ta.UserID_TA = @UserID)
      )
    ORDER BY 
        CASE 
            WHEN co.[Status] = 'Ongoing' THEN 1
            WHEN co.[Status] = 'Upcoming' THEN 2
            ELSE 3
        END,
        co.StartTime ASC
    OFFSET (@Page - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Contest_AddProblem
    @ContestID INT,
    @ProblemID INT,
    @RequesterID INT,
    @MaxScore INT = 100,
    @OrderIndex INT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (
            SELECT 1
            FROM dbo.Contests c WITH (UPDLOCK, HOLDLOCK)
            JOIN dbo.Users u ON u.UserID = @RequesterID
            WHERE c.ContestID = @ContestID
              AND (c.CreatorID = @RequesterID OR u.Role = 'Admin')
        )
            THROW 50035, N'Bạn không có quyền thêm bài tập vào kỳ thi này.', 1;

        DECLARE @ProblemStatus VARCHAR(20), @ProblemCreatorID INT, @RequesterRole VARCHAR(20);
        SELECT @ProblemStatus = Status, @ProblemCreatorID = CreatorID
        FROM dbo.Problems WITH (UPDLOCK, HOLDLOCK)
        WHERE ProblemID = @ProblemID;

        SELECT @RequesterRole = Role FROM dbo.Users WHERE UserID = @RequesterID;

        IF @ProblemStatus IS NULL
            THROW 50036, N'Bài tập không tồn tại.', 1;

        IF @ProblemStatus NOT IN ('Public', 'Private')
            THROW 50037, N'Chỉ có thể thêm bài Công khai hoặc bài Riêng tư được phép quản lý.', 1;

        IF @ProblemStatus = 'Private'
           AND @RequesterRole <> 'Admin'
           AND NOT (
               @RequesterRole = 'Teacher'
               AND (
                   @ProblemCreatorID = @RequesterID
                   OR EXISTS (
                       SELECT 1
                       FROM dbo.Class_Problem cp
                       JOIN dbo.Classes c ON c.ClassID = cp.ClassID
                       WHERE cp.ProblemID = @ProblemID AND c.TeacherID = @RequesterID
                   )
               )
           )
            THROW 50037, N'Bạn không có quyền sử dụng bài Riêng tư này trong kỳ thi.', 1;

        IF EXISTS (SELECT 1 FROM dbo.Contest_Problem WHERE ContestID = @ContestID AND ProblemID = @ProblemID)
        BEGIN
            UPDATE dbo.Contest_Problem
            SET MaxScore = @MaxScore,
                OrderIndex = @OrderIndex
            WHERE ContestID = @ContestID AND ProblemID = @ProblemID;

            UPDATE cu
            SET TotalScore = ISNULL(scores.TotalScore, 0)
            FROM dbo.Contest_User cu
            OUTER APPLY (
                SELECT SUM(cpr.BestRatio * cp.MaxScore) AS TotalScore
                FROM dbo.ContestProblemResults cpr
                JOIN dbo.Contest_Problem cp ON cp.ContestID = cpr.ContestID AND cp.ProblemID = cpr.ProblemID
                WHERE cpr.ContestID = cu.ContestID AND cpr.UserID = cu.UserID
            ) scores
            WHERE cu.ContestID = @ContestID;
        END
        ELSE
        BEGIN
            INSERT dbo.Contest_Problem (ContestID, ProblemID, MaxScore, OrderIndex)
            VALUES (@ContestID, @ProblemID, @MaxScore, @OrderIndex);
        END;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Contest_UpdateProblemScore
    @ContestID INT,
    @ProblemID INT,
    @RequesterID INT,
    @MaxScore INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Contests c
        LEFT JOIN dbo.Users u ON u.UserID = @RequesterID
        WHERE c.ContestID = @ContestID
          AND (c.CreatorID = @RequesterID OR u.Role = 'Admin')
    )
        THROW 50035, N'Bạn không có quyền cập nhật điểm bài tập trong kỳ thi này.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Contest_Problem WHERE ContestID = @ContestID AND ProblemID = @ProblemID)
        THROW 50036, N'Bài tập không thuộc kỳ thi này.', 1;

    IF @MaxScore <= 0
        THROW 50037, N'Điểm tối đa phải lớn hơn 0.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.Contest_Problem
        SET MaxScore = @MaxScore
        WHERE ContestID = @ContestID AND ProblemID = @ProblemID;

        UPDATE cu
        SET TotalScore = ISNULL(scores.TotalScore, 0)
        FROM dbo.Contest_User cu
        OUTER APPLY (
            SELECT SUM(cpr.BestRatio * cp.MaxScore) AS TotalScore
            FROM dbo.ContestProblemResults cpr
            JOIN dbo.Contest_Problem cp ON cp.ContestID = cpr.ContestID AND cp.ProblemID = cpr.ProblemID
            WHERE cpr.ContestID = cu.ContestID AND cpr.UserID = cu.UserID
        ) scores
        WHERE cu.ContestID = @ContestID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Contest_RemoveProblem
    @ContestID INT,
    @ProblemID INT,
    @RequesterID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 
        FROM dbo.Contests c
        LEFT JOIN dbo.Users u ON u.UserID = @RequesterID
        WHERE c.ContestID = @ContestID 
          AND (c.CreatorID = @RequesterID OR u.Role = 'Admin')
    )
        THROW 50037, N'Bạn không có quyền xóa bài tập khỏi kỳ thi này.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        DELETE FROM dbo.ContestProblemResults
        WHERE ContestID = @ContestID AND ProblemID = @ProblemID;

        DELETE FROM dbo.Contest_Problem 
        WHERE ContestID = @ContestID AND ProblemID = @ProblemID;

        UPDATE dbo.Submissions
        SET ContestID = NULL
        WHERE ContestID = @ContestID AND ProblemID = @ProblemID;

        UPDATE cu
        SET TotalScore = ISNULL(scores.TotalScore, 0),
            PenaltyTime = ISNULL(scores.TotalPenalty, 0)
        FROM dbo.Contest_User cu
        OUTER APPLY (
            SELECT 
                SUM(cpr.BestRatio * cp.MaxScore) AS TotalScore,
                SUM(CASE WHEN cpr.Solved = 1 THEN cpr.SolveMinute + (cpr.WrongCount * 20) ELSE 0 END) AS TotalPenalty
            FROM dbo.ContestProblemResults cpr
            JOIN dbo.Contest_Problem cp ON cp.ContestID = cpr.ContestID AND cp.ProblemID = cpr.ProblemID
            WHERE cpr.ContestID = cu.ContestID AND cpr.UserID = cu.UserID
        ) scores
        WHERE cu.ContestID = @ContestID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Contest_ListProblems
    @ContestID INT,
    @RequesterID INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Status VARCHAR(20);
    DECLARE @CreatorID INT;
    DECLARE @IsAdmin BIT = 0;

    IF EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @RequesterID AND Role = 'Admin')
        SET @IsAdmin = 1;

    SELECT
        @Status = app.ufn_GetContestStatus(StartTime, EndTime),
        @CreatorID = CreatorID
    FROM dbo.Contests 
    WHERE ContestID = @ContestID;

    IF @Status IS NULL
        THROW 50038, N'Kỳ thi không tồn tại.', 1;

    IF @CreatorID <> @RequesterID AND @IsAdmin = 0
       AND NOT EXISTS (SELECT 1 FROM dbo.Contest_User WHERE ContestID = @ContestID AND UserID = @RequesterID)
       AND NOT (
           @Status = 'Ended'
           AND EXISTS (
               SELECT 1 FROM dbo.Contests c
               WHERE c.ContestID = @ContestID
                 AND (c.ClassID IS NULL OR app.ufn_CanUserAccessContest(@ContestID, @RequesterID) = 1)
           )
       )
        THROW 50039, N'Bạn cần tham gia kỳ thi trước khi xem danh sách đề.', 1;

    IF @Status = 'Upcoming' AND @CreatorID <> @RequesterID AND @IsAdmin = 0
        THROW 50039, N'Kỳ thi chưa bắt đầu.', 1;

    SELECT
        cp.ProblemID,
        p.Title,
        p.Difficulty,
        p.TimeLimit,
        p.MemoryLimit,
        cp.MaxScore,
        cp.OrderIndex,
        ISNULL(cpr.Solved, 0) AS Solved,
        ISNULL(cpr.WrongCount, 0) AS WrongCount,
        cpr.SolveMinute
    FROM dbo.Contest_Problem cp
    JOIN dbo.Problems p ON p.ProblemID = cp.ProblemID
    LEFT JOIN dbo.ContestProblemResults cpr 
        ON cpr.ContestID = cp.ContestID 
       AND cpr.ProblemID = cp.ProblemID 
       AND cpr.UserID = @RequesterID
    WHERE cp.ContestID = @ContestID
      AND (
          @CreatorID = @RequesterID OR @IsAdmin = 1
          OR app.ufn_CanUserAccessContestProblem(@ContestID, cp.ProblemID, @RequesterID) = 1
      )
    ORDER BY cp.OrderIndex ASC, cp.ProblemID ASC;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Contest_Join
    @ContestID INT,
    @UserID INT,
    @Password VARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @ExpectedPassword VARCHAR(255);
    DECLARE @ClassID INT;
    DECLARE @CreatorID INT;
    DECLARE @Status VARCHAR(20);

    SELECT 
        @ExpectedPassword = [Password],
        @ClassID = ClassID,
        @CreatorID = CreatorID,
        @Status = app.ufn_GetContestStatus(StartTime, EndTime)
    FROM dbo.Contests
    WHERE ContestID = @ContestID;

    IF @CreatorID IS NULL
        THROW 50040, N'Kỳ thi không tồn tại.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role IN ('User', 'Teacher', 'TA'))
        THROW 50043, N'Tài khoản này không thể tham gia kỳ thi.', 1;

    IF @CreatorID = @UserID
        THROW 50043, N'Người tạo kỳ thi quản lý kỳ thi và không thể tham gia như thí sinh.', 1;

    IF @Status = 'Ended'
        THROW 50043, N'Kỳ thi đã kết thúc.', 1;

    IF EXISTS (SELECT 1 FROM dbo.Contest_User WHERE ContestID = @ContestID AND UserID = @UserID)
        RETURN;

    IF @ClassID IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @ClassID AND UserID = @UserID)
           AND NOT EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND TeacherID = @UserID)
           AND NOT EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = @ClassID AND UserID_TA = @UserID)
           AND NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role = 'Admin')
        BEGIN
            THROW 50042, N'Bạn không thuộc lớp học của kỳ thi này.', 1;
        END;
    END
    ELSE IF @ExpectedPassword IS NOT NULL AND LEN(@ExpectedPassword) > 0
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role = 'Admin')
           AND @CreatorID <> @UserID
           AND ISNULL(@Password, '') <> @ExpectedPassword
        BEGIN
            THROW 50041, N'Mật khẩu kỳ thi không đúng.', 1;
        END;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT dbo.Contest_User (ContestID, UserID, TotalScore, PenaltyTime)
        VALUES (@ContestID, @UserID, 0, 0);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Contest_GetLeaderboard
    @ContestID INT,
    @RequesterID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Contests c
        WHERE c.ContestID = @ContestID
          AND (
              c.ClassID IS NULL
              OR c.CreatorID = @RequesterID
              OR EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @RequesterID AND Role = 'Admin')
              OR EXISTS (SELECT 1 FROM dbo.Contest_User cu WHERE cu.ContestID = c.ContestID AND cu.UserID = @RequesterID)
              OR EXISTS (SELECT 1 FROM dbo.Classes cls WHERE cls.ClassID = c.ClassID AND cls.TeacherID = @RequesterID)
              OR EXISTS (SELECT 1 FROM dbo.Class_Student cs WHERE cs.ClassID = c.ClassID AND cs.UserID = @RequesterID)
              OR EXISTS (SELECT 1 FROM dbo.Class_TA ta WHERE ta.ClassID = c.ClassID AND ta.UserID_TA = @RequesterID)
          )
    )
        THROW 50045, N'Bạn không có quyền xem bảng xếp hạng kỳ thi này.', 1;

    SELECT 
        [Rank],
        UserID,
        Username,
        FullName,
        Avatar,
        TotalScore,
        PenaltyTime,
        ProblemsSolved
    FROM app.ufn_GetContestLeaderboard(@ContestID)
    ORDER BY [Rank] ASC, PenaltyTime ASC;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Contest_StartNow
    @ContestID INT,
    @RequesterID INT,
    @DurationMinutes INT = 60
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 
        FROM dbo.Contests c
        LEFT JOIN dbo.Users u ON u.UserID = @RequesterID
        WHERE c.ContestID = @ContestID 
          AND (c.CreatorID = @RequesterID OR u.Role = 'Admin')
    )
        THROW 50033, N'Bạn không có quyền bắt đầu kỳ thi này.', 1;

    IF @DurationMinutes <= 0
        SET @DurationMinutes = 60;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @Now DATETIME2(0) = SYSUTCDATETIME();

        UPDATE dbo.Contests
        SET StartTime = @Now,
            EndTime = DATEADD(MINUTE, @DurationMinutes, @Now)
        WHERE ContestID = @ContestID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Contest_CheckProblemAccess
    @ContestID INT,
    @ProblemID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT app.ufn_CanUserAccessContestProblem(@ContestID, @ProblemID, @UserID) AS CanAccess;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Contest_Delete
    @ContestID INT,
    @RequesterID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Contests WHERE ContestID = @ContestID)
        THROW 50038, N'Kỳ thi không tồn tại.', 1;

    IF NOT EXISTS (
        SELECT 1 
        FROM dbo.Contests c
        LEFT JOIN dbo.Users u ON u.UserID = @RequesterID
        WHERE c.ContestID = @ContestID 
          AND (c.CreatorID = @RequesterID OR u.Role = 'Admin')
    )
        THROW 50033, N'Bạn không có quyền xóa kỳ thi này.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.Submissions
        SET ContestID = NULL
        WHERE ContestID = @ContestID;

        DELETE FROM dbo.Comments
        WHERE ContestID = @ContestID;

        DELETE FROM dbo.ContestProblemResults
        WHERE ContestID = @ContestID;

        DELETE FROM dbo.Contest_Problem
        WHERE ContestID = @ContestID;

        DELETE FROM dbo.Contest_User
        WHERE ContestID = @ContestID;

        DELETE FROM dbo.Contests
        WHERE ContestID = @ContestID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
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

