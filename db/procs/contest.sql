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
        THROW 50030, 'Chi giao vien hoac quan tri vien moi co the tao ky thi.', 1;

    IF @EndTime <= @StartTime
        THROW 50031, 'Thoi gian ket thuc phai sau thoi gian bat dau.', 1;

    IF @ClassID IS NOT NULL AND NOT EXISTS (
        SELECT 1 
        FROM dbo.Classes 
        WHERE ClassID = @ClassID AND (TeacherID = @CreatorID OR EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @CreatorID AND Role = 'Admin'))
    )
        THROW 50032, 'Lop hoc khong ton tai hoac ban khong co quyen gan ky thi vao lop hoc nay.', 1;

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
        THROW 50033, 'Ban khong co quyen cap nhat ky thi nay.', 1;

    IF @EndTime <= @StartTime
        THROW 50034, 'Thoi gian ket thuc phai sau thoi gian bat dau.', 1;

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
      AND (@Search IS NULL OR co.ContestName LIKE '%' + @Search + '%')
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
            THROW 50035, 'Ban khong co quyen them bai tap vao ky thi nay.', 1;

        DECLARE @ProblemStatus VARCHAR(20), @ProblemCreatorID INT, @RequesterRole VARCHAR(20);
        SELECT @ProblemStatus = Status, @ProblemCreatorID = CreatorID
        FROM dbo.Problems WITH (UPDLOCK, HOLDLOCK)
        WHERE ProblemID = @ProblemID;

        SELECT @RequesterRole = Role FROM dbo.Users WHERE UserID = @RequesterID;

        IF @ProblemStatus IS NULL
            THROW 50036, 'Bai tap khong ton tai.', 1;

        IF @ProblemStatus NOT IN ('Public', 'Private')
            THROW 50037, 'Chi co the them bai Cong khai hoac bai Rieng tu duoc phep quan ly.', 1;

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
            THROW 50037, 'Ban khong co quyen su dung bai Rieng tu nay trong ky thi.', 1;

        IF EXISTS (SELECT 1 FROM dbo.Contest_Problem WHERE ContestID = @ContestID AND ProblemID = @ProblemID)
        BEGIN
            UPDATE dbo.Contest_Problem
            SET MaxScore = @MaxScore,
                OrderIndex = @OrderIndex
            WHERE ContestID = @ContestID AND ProblemID = @ProblemID;
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
        THROW 50037, 'Ban khong co quyen xoa bai tap khoi ky thi nay.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        DELETE FROM dbo.Contest_Problem 
        WHERE ContestID = @ContestID AND ProblemID = @ProblemID;

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
        THROW 50038, 'Ky thi khong ton tai.', 1;

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
        THROW 50039, 'Ban can tham gia ky thi truoc khi xem danh sach de.', 1;

    IF @Status = 'Upcoming' AND @CreatorID <> @RequesterID AND @IsAdmin = 0
        THROW 50039, 'Ky thi chua bat dau.', 1;

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
        THROW 50040, 'Ky thi khong ton tai.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role IN ('User', 'Teacher'))
        THROW 50043, 'Tai khoan nay khong the tham gia ky thi.', 1;

    IF @CreatorID = @UserID
        THROW 50043, 'Nguoi tao ky thi quan ly ky thi va khong the tham gia nhu thi sinh.', 1;

    IF @Status = 'Ended'
        THROW 50043, 'Ky thi da ket thuc.', 1;

    IF EXISTS (SELECT 1 FROM dbo.Contest_User WHERE ContestID = @ContestID AND UserID = @UserID)
        RETURN;

    IF @ClassID IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @ClassID AND UserID = @UserID)
           AND NOT EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND TeacherID = @UserID)
           AND NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role = 'Admin')
        BEGIN
            THROW 50042, 'Ban khong thuoc lop hoc cua ky thi nay.', 1;
        END;
    END
    ELSE IF @ExpectedPassword IS NOT NULL AND LEN(@ExpectedPassword) > 0
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role = 'Admin')
           AND @CreatorID <> @UserID
           AND ISNULL(@Password, '') <> @ExpectedPassword
        BEGIN
            THROW 50041, 'Mat khau ky thi khong dung.', 1;
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
        THROW 50045, 'Ban khong co quyen xem bang xep hang ky thi nay.', 1;

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
        THROW 50033, 'Ban khong co quyen bat dau ky thi nay.', 1;

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
        THROW 50038, 'Ky thi khong ton tai.', 1;

    IF NOT EXISTS (
        SELECT 1 
        FROM dbo.Contests c
        LEFT JOIN dbo.Users u ON u.UserID = @RequesterID
        WHERE c.ContestID = @ContestID 
          AND (c.CreatorID = @RequesterID OR u.Role = 'Admin')
    )
        THROW 50033, 'Ban khong co quyen xoa ky thi nay.', 1;

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
