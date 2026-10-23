CREATE OR ALTER PROCEDURE app.usp_Problem_Create
    @CreatorID INT,
    @Title NVARCHAR(200),
    @Statement NVARCHAR(MAX),
    @InputFormat NVARCHAR(MAX),
    @OutputFormat NVARCHAR(MAX),
    @TimeLimit INT,
    @MemoryLimit INT,
    @Tags NVARCHAR(200),
    @Difficulty VARCHAR(20),
    @Status VARCHAR(20) = 'Public',
    @ClassID INT = NULL,
    @DueDate DATETIME2(0) = NULL,
    @FunctionSpec NVARCHAR(MAX) = NULL,
    @ProposedStatus VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Status IS NULL OR @Status NOT IN ('Public', 'Private', 'Hidden', 'Pending')
        SET @Status = 'Public';

    DECLARE @CreatorRole VARCHAR(20);
    SELECT @CreatorRole = Role FROM dbo.Users WHERE UserID = @CreatorID;

    IF @CreatorRole = 'TA' AND @ClassID IS NULL
        THROW 50012, N'Trợ giảng cần chọn lớp đang được phân công khi tạo bài tập.', 1;
    
    IF @CreatorRole = 'TA'
    BEGIN
        SET @Status = 'Pending';
        IF @ProposedStatus IS NULL OR @ProposedStatus NOT IN ('Public', 'Private') SET @ProposedStatus = 'Private';
    END
    ELSE
        SET @ProposedStatus = NULL;

    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT dbo.Problems (CreatorID, Title, Statement, InputFormat, OutputFormat, TimeLimit, MemoryLimit, Tags, Difficulty, Status, FunctionSpec, ProposedStatus)
        VALUES (@CreatorID, @Title, @Statement, @InputFormat, @OutputFormat, @TimeLimit, @MemoryLimit, @Tags, @Difficulty, @Status, @FunctionSpec, @ProposedStatus);

        DECLARE @NewProblemID INT = SCOPE_IDENTITY();

        IF @ClassID IS NOT NULL
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM dbo.Classes c
                LEFT JOIN dbo.Class_TA ta ON ta.ClassID = c.ClassID AND ta.UserID_TA = @CreatorID
                WHERE c.ClassID = @ClassID AND c.IsCancelled = 0 AND c.ApprovalStatus = 'Approved' AND (c.TeacherID = @CreatorID OR ta.UserID_TA IS NOT NULL OR EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @CreatorID AND Role = 'Admin'))
            )
                THROW 50012, N'Lớp học không tồn tại hoặc bạn không có quyền gán bài tập vào lớp học này.', 1;

            INSERT dbo.Class_Problem (ClassID, ProblemID, AssignedDate, DueDate, IsClosed)
            VALUES (@ClassID, @NewProblemID, SYSUTCDATETIME(), @DueDate, 0);
        END;

        COMMIT TRANSACTION;

        SELECT @NewProblemID AS ProblemID;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Problem_Update
    @ProblemID INT,
    @ActorID INT,
    @Title NVARCHAR(200),
    @Statement NVARCHAR(MAX),
    @InputFormat NVARCHAR(MAX),
    @OutputFormat NVARCHAR(MAX),
    @TimeLimit INT,
    @MemoryLimit INT,
    @Tags NVARCHAR(200),
    @Difficulty VARCHAR(20),
    @Status VARCHAR(20) = NULL,
    @FunctionSpec NVARCHAR(MAX) = NULL,
    @ProposedStatus VARCHAR(20) = NULL,
    @NeedsReview BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Problems p
        JOIN dbo.Users u ON u.UserID = @ActorID
        WHERE p.ProblemID = @ProblemID AND (
            u.Role = 'Admin' 
            OR (p.CreatorID = @ActorID AND u.Role = 'Teacher')
            OR (p.CreatorID = @ActorID AND u.Role = 'TA' AND EXISTS (
                SELECT 1 FROM dbo.Class_Problem cp
                JOIN dbo.Classes c ON c.ClassID = cp.ClassID
                JOIN dbo.Class_TA ta ON ta.ClassID = c.ClassID AND ta.UserID_TA = @ActorID
                WHERE cp.ProblemID = p.ProblemID AND c.IsCancelled = 0 AND c.ApprovalStatus = 'Approved'
            ))
            OR (u.Role = 'Teacher' AND EXISTS (
                SELECT 1 FROM dbo.Class_Problem cp
                JOIN dbo.Classes c ON c.ClassID = cp.ClassID
                WHERE cp.ProblemID = p.ProblemID AND c.TeacherID = @ActorID
            ))
        )
    )
        THROW 50010, N'Bạn không có quyền sửa bài tập này.', 1;

    DECLARE @CurrentStatus VARCHAR(20);
    DECLARE @CurrentTitle NVARCHAR(200);
    DECLARE @CurrentStatement NVARCHAR(MAX);
    DECLARE @CurrentInputFormat NVARCHAR(MAX);
    DECLARE @CurrentOutputFormat NVARCHAR(MAX);
    DECLARE @CurrentTimeLimit INT;
    DECLARE @CurrentMemoryLimit INT;
    DECLARE @CurrentFunctionSpec NVARCHAR(MAX);
    DECLARE @ActorRole VARCHAR(20);

    SELECT 
        @CurrentStatus = p.Status, 
        @CurrentTitle = p.Title,
        @CurrentStatement = p.Statement,
        @CurrentInputFormat = p.InputFormat,
        @CurrentOutputFormat = p.OutputFormat,
        @CurrentTimeLimit = p.TimeLimit,
        @CurrentMemoryLimit = p.MemoryLimit,
        @CurrentFunctionSpec = p.FunctionSpec,
        @ActorRole = u.Role 
    FROM dbo.Problems p
    JOIN dbo.Users u ON u.UserID = @ActorID
    WHERE p.ProblemID = @ProblemID;

    -- Nội dung hiển thị và cấu hình chấm cần giảng viên duyệt lại; metadata không cần.
    DECLARE @IsMajorEdit BIT = 0;
    IF @ActorRole = 'TA' AND (@CurrentStatus NOT IN ('Pending', 'Rejected') OR @NeedsReview = 1)
    BEGIN
        IF @NeedsReview = 1
           OR (@Title <> @CurrentTitle)
           OR (@Statement <> @CurrentStatement)
           OR (COALESCE(@InputFormat, N'') <> COALESCE(@CurrentInputFormat, N''))
           OR (COALESCE(@OutputFormat, N'') <> COALESCE(@CurrentOutputFormat, N''))
           OR (@TimeLimit <> @CurrentTimeLimit)
           OR (@MemoryLimit <> @CurrentMemoryLimit)
           OR (COALESCE(@FunctionSpec, '') <> COALESCE(@CurrentFunctionSpec, ''))
        BEGIN
            SET @IsMajorEdit = 1;
        END
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.Problems
        SET Title = @Title, Statement = @Statement, InputFormat = @InputFormat,
            OutputFormat = @OutputFormat, TimeLimit = @TimeLimit, MemoryLimit = @MemoryLimit,
            Tags = @Tags, Difficulty = @Difficulty,
            Status = CASE 
                WHEN @ActorRole = 'TA' AND @CurrentStatus = 'Rejected' THEN 'Pending' 
                WHEN @ActorRole = 'TA' AND @CurrentStatus = 'Pending' THEN 'Pending'
                WHEN @ActorRole = 'TA' AND @IsMajorEdit = 1 THEN 'Pending'
                WHEN @ActorRole = 'TA' THEN Status
                ELSE COALESCE(@Status, Status) 
            END,
            RejectionReason = CASE 
                WHEN @ActorRole = 'TA' AND (@CurrentStatus = 'Rejected' OR @IsMajorEdit = 1) THEN NULL 
                ELSE RejectionReason 
            END,
            ProposedStatus = CASE
                WHEN @ActorRole = 'TA' AND (@CurrentStatus IN ('Pending', 'Rejected') OR @IsMajorEdit = 1)
                    THEN CASE WHEN @ProposedStatus IN ('Public', 'Private') THEN @ProposedStatus ELSE COALESCE(ProposedStatus, 'Private') END
                ELSE ProposedStatus
            END,
            FunctionSpec = COALESCE(@FunctionSpec, FunctionSpec)
        WHERE ProblemID = @ProblemID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Problem_SetStatus
    @ProblemID INT,
    @ActorID INT,
    @Status VARCHAR(20),
    @RejectionReason NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @Status NOT IN ('Public', 'Private', 'Hidden', 'Pending', 'Rejected')
        THROW 50013, N'Trạng thái bài tập không hợp lệ.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Problems p
        JOIN dbo.Users u ON u.UserID = @ActorID
        WHERE p.ProblemID = @ProblemID AND (
            u.Role = 'Admin' 
            OR (p.CreatorID = @ActorID AND u.Role = 'Teacher')
            OR (u.Role = 'Teacher' AND EXISTS (
                SELECT 1 FROM dbo.Class_Problem cp
                JOIN dbo.Classes c ON c.ClassID = cp.ClassID
                WHERE cp.ProblemID = p.ProblemID AND c.TeacherID = @ActorID
            ))
        )
    )
        THROW 50010, N'Bạn không có quyền thay đổi bài tập này.', 1;

    UPDATE dbo.Problems 
    SET Status = @Status, 
        RejectionReason = CASE WHEN @Status = 'Rejected' THEN @RejectionReason ELSE NULL END,
        ProposedStatus = CASE WHEN @Status IN ('Public', 'Private') THEN NULL ELSE ProposedStatus END
    WHERE ProblemID = @ProblemID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Problem_Delete
    @ProblemID INT,
    @ActorID INT
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (
        SELECT 1 FROM dbo.Problems p
        JOIN dbo.Users u ON u.UserID = @ActorID
        WHERE p.ProblemID = @ProblemID AND (
            u.Role = 'Admin' 
            OR (p.CreatorID = @ActorID AND u.Role IN ('Teacher', 'TA'))
            OR (u.Role = 'Teacher' AND EXISTS (
                SELECT 1 FROM dbo.Class_Problem cp
                JOIN dbo.Classes c ON c.ClassID = cp.ClassID
                WHERE cp.ProblemID = p.ProblemID AND c.TeacherID = @ActorID
            ))
        )
    )
        THROW 50010, N'Bạn không có quyền xóa bài tập này.', 1;

    IF EXISTS (SELECT 1 FROM dbo.Submissions WHERE ProblemID = @ProblemID)
        THROW 50011, N'Bài tập đã có bài nộp, hãy khóa thay vì xóa.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.Contest_Problem cp
        JOIN dbo.Contests c ON c.ContestID = cp.ContestID
        WHERE cp.ProblemID = @ProblemID AND c.StartTime <= SYSUTCDATETIME()
    )
        THROW 50012, N'Bài tập đang hoặc đã được dùng trong kỳ thi, hãy khóa thay vì xóa.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Gỡ bài khỏi lớp và kỳ thi chưa bắt đầu trước khi xóa (các khóa ngoại không tự xóa).
        DELETE FROM dbo.ContestProblemResults WHERE ProblemID = @ProblemID;
        DELETE FROM dbo.Contest_Problem WHERE ProblemID = @ProblemID;
        DELETE FROM dbo.Class_Problem WHERE ProblemID = @ProblemID;
        DELETE FROM dbo.Testcases WHERE ProblemID = @ProblemID;
        DELETE FROM dbo.Problems WHERE ProblemID = @ProblemID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Problem_Get
    @ProblemID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        p.ProblemID, p.CreatorID, u.FullName AS CreatorFullName, 
        p.Title, p.Statement, p.InputFormat, p.OutputFormat,
        p.TimeLimit, p.MemoryLimit, p.Tags, p.Difficulty, p.Status, 
        p.RejectionReason, p.FunctionSpec, p.ProposedStatus,
        cp.ClassID, c.ClassName, c.TeacherID
    FROM dbo.Problems p
    LEFT JOIN dbo.Users u ON u.UserID = p.CreatorID
    OUTER APPLY (
        SELECT TOP (1) cp.ClassID
        FROM dbo.Class_Problem cp
        WHERE cp.ProblemID = p.ProblemID
        ORDER BY cp.AssignedDate DESC, cp.ClassID
    ) cp
    LEFT JOIN dbo.Classes c ON c.ClassID = cp.ClassID
    WHERE p.ProblemID = @ProblemID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Problem_CanTAEdit
    @ProblemID INT,
    @TAID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CAST(CASE WHEN EXISTS (
        SELECT 1
        FROM dbo.Problems p
        JOIN dbo.Users u ON u.UserID = @TAID AND u.Role = 'TA'
        JOIN dbo.Class_Problem cp ON cp.ProblemID = p.ProblemID
        JOIN dbo.Classes c ON c.ClassID = cp.ClassID AND c.IsCancelled = 0 AND c.ApprovalStatus = 'Approved'
        JOIN dbo.Class_TA ta ON ta.ClassID = c.ClassID AND ta.UserID_TA = @TAID
        WHERE p.ProblemID = @ProblemID AND p.CreatorID = @TAID
    ) THEN 1 ELSE 0 END AS BIT) AS CanEdit;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Problem_ListForUser
    @UserID INT,
    @Search NVARCHAR(200) = NULL,
    @Tag NVARCHAR(50) = NULL,
    @Difficulty VARCHAR(20) = NULL,
    @UserStatus VARCHAR(10) = NULL,
    @ProblemStatus VARCHAR(20) = NULL,
    @Page INT = 1,
    @PageSize INT = 20,
    @OwnerOnly BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    WITH Base AS (
        SELECT
            p.ProblemID, p.Title, p.Tags, p.Difficulty, p.Status, p.CreatorID,
            u.FullName AS CreatorFullName,
            ROUND(COALESCE(r.AcRate, 0), 0) AS AcRate,
            CASE
                WHEN EXISTS (SELECT 1 FROM dbo.Submissions s WHERE s.ProblemID = p.ProblemID AND s.UserID = @UserID AND s.Result = 'AC') THEN 'done'
                WHEN EXISTS (SELECT 1 FROM dbo.Submissions s WHERE s.ProblemID = p.ProblemID AND s.UserID = @UserID) THEN 'tried'
                ELSE 'todo'
            END AS UserStatus,
            c.ClassName
        FROM dbo.Problems p
        LEFT JOIN dbo.Users u ON u.UserID = p.CreatorID
        LEFT JOIN dbo.vw_ProblemAcRate r ON r.ProblemID = p.ProblemID
        OUTER APPLY (
            SELECT TOP (1) cl.ClassName
            FROM dbo.Class_Problem cp
            JOIN dbo.Classes cl ON cl.ClassID = cp.ClassID
            WHERE cp.ProblemID = p.ProblemID
            ORDER BY cp.AssignedDate DESC, cp.ClassID
        ) c
        WHERE (@OwnerOnly = 0 OR p.CreatorID = @UserID)
          AND (@OwnerOnly = 1 OR p.Status = 'Public' OR p.CreatorID = @UserID)
          AND (@Search IS NULL OR p.Title LIKE '%' + @Search + '%')
          AND (@Tag IS NULL OR ',' + REPLACE(p.Tags, ' ', '') + ',' LIKE '%,' + REPLACE(@Tag, ' ', '') + ',%' OR p.Tags LIKE '%' + @Tag + '%')
          AND (@Difficulty IS NULL OR p.Difficulty = @Difficulty)
          AND (@ProblemStatus IS NULL OR p.Status = @ProblemStatus)
    )
    SELECT *, COUNT(*) OVER () AS TotalCount
    FROM Base
    WHERE @UserStatus IS NULL OR UserStatus = @UserStatus
    ORDER BY ProblemID
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Problem_ListForManage
    @ActorID INT,
    @Search NVARCHAR(200) = NULL,
    @Tag VARCHAR(100) = NULL,
    @Difficulty VARCHAR(20) = NULL,
    @Status VARCHAR(20) = NULL,
    @Page INT = 1,
    @PageSize INT = 20,
    @OwnerOnly BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @IsAdmin BIT = (SELECT CASE WHEN Role = 'Admin' THEN 1 ELSE 0 END FROM dbo.Users WHERE UserID = @ActorID);

    SELECT 
        p.ProblemID, p.Title, p.Tags, p.Difficulty, p.Status, p.ProposedStatus, p.CreatedAt, p.CreatorID,
        u.FullName AS CreatorFullName,
        c.ClassID, c.ClassName,
        CAST(CASE WHEN @IsAdmin = 1 OR p.CreatorID = @ActorID OR EXISTS (
            SELECT 1 FROM dbo.Class_Problem manage_cp
            JOIN dbo.Classes manage_c ON manage_c.ClassID = manage_cp.ClassID
            WHERE manage_cp.ProblemID = p.ProblemID AND manage_c.TeacherID = @ActorID
        ) THEN 1 ELSE 0 END AS BIT) AS CanManage,
        COUNT(*) OVER () AS TotalCount
    FROM dbo.Problems p
    LEFT JOIN dbo.Users u ON u.UserID = p.CreatorID
    OUTER APPLY (
        SELECT TOP (1) cl.ClassID, cl.ClassName
        FROM dbo.Class_Problem cp
        JOIN dbo.Classes cl ON cl.ClassID = cp.ClassID
        WHERE cp.ProblemID = p.ProblemID
        ORDER BY cp.AssignedDate DESC, cp.ClassID
    ) c
    WHERE (@OwnerOnly = 0 OR p.CreatorID = @ActorID)
      AND (
            @OwnerOnly = 1
            OR @IsAdmin = 1
            OR p.CreatorID = @ActorID
            OR p.Status = 'Public'
            OR EXISTS (
                SELECT 1 FROM dbo.Class_Problem cp
                JOIN dbo.Classes cl ON cl.ClassID = cp.ClassID
                WHERE cp.ProblemID = p.ProblemID AND cl.TeacherID = @ActorID
            )
      )
      AND (@Search IS NULL OR p.Title LIKE '%' + @Search + '%')
      AND (@Tag IS NULL OR ',' + REPLACE(p.Tags, ' ', '') + ',' LIKE '%,' + REPLACE(@Tag, ' ', '') + ',%' OR p.Tags LIKE '%' + @Tag + '%')
      AND (@Difficulty IS NULL OR p.Difficulty = @Difficulty)
      AND (@Status IS NULL OR p.Status = @Status)
    ORDER BY p.ProblemID DESC
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Testcase_ListPublic
    @ProblemID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TestCaseID, InputData, ExpectedOutput, OrderIndex
    FROM dbo.Testcases WHERE ProblemID = @ProblemID AND IsHidden = 0
    ORDER BY OrderIndex;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Testcase_ListForOwner
    @ProblemID INT,
    @ActorID INT
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (
        SELECT 1 FROM dbo.Problems p
        JOIN dbo.Users u ON u.UserID = @ActorID
        WHERE p.ProblemID = @ProblemID AND (
            u.Role = 'Admin' 
            OR (p.CreatorID = @ActorID AND u.Role = 'Teacher')
            OR (p.CreatorID = @ActorID AND u.Role = 'TA' AND EXISTS (
                SELECT 1 FROM dbo.Class_Problem cp
                JOIN dbo.Classes c ON c.ClassID = cp.ClassID
                JOIN dbo.Class_TA ta ON ta.ClassID = c.ClassID AND ta.UserID_TA = @ActorID
                WHERE cp.ProblemID = p.ProblemID AND c.IsCancelled = 0 AND c.ApprovalStatus = 'Approved'
            ))
            OR (u.Role = 'Teacher' AND EXISTS (
                SELECT 1 FROM dbo.Class_Problem cp
                JOIN dbo.Classes c ON c.ClassID = cp.ClassID
                WHERE cp.ProblemID = p.ProblemID AND c.TeacherID = @ActorID
            ))
        )
    )
        THROW 50010, N'Bạn không có quyền xem testcase của bài tập này.', 1;

    SELECT TestCaseID, InputData, ExpectedOutput, IsHidden, OrderIndex
    FROM dbo.Testcases WHERE ProblemID = @ProblemID
    ORDER BY OrderIndex;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Testcase_ReplaceAll
    @ProblemID INT,
    @ActorID INT,
    @TestcasesJson NVARCHAR(MAX),
    -- Optional: {"compareMode":"float","floatEpsilon":1e-6,"groups":[{"groupNo":1,"points":40}]}.
    -- NULL keeps the current checker settings and groups.
    @ScoringJson NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @CurrentStatus VARCHAR(20);
    DECLARE @ActorRole VARCHAR(20);

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Problems p
        JOIN dbo.Users u ON u.UserID = @ActorID
        WHERE p.ProblemID = @ProblemID AND (
            u.Role = 'Admin' 
            OR (p.CreatorID = @ActorID AND u.Role = 'Teacher')
            OR (p.CreatorID = @ActorID AND u.Role = 'TA' AND EXISTS (
                SELECT 1 FROM dbo.Class_Problem cp
                JOIN dbo.Classes c ON c.ClassID = cp.ClassID
                JOIN dbo.Class_TA ta ON ta.ClassID = c.ClassID AND ta.UserID_TA = @ActorID
                WHERE cp.ProblemID = p.ProblemID AND c.IsCancelled = 0 AND c.ApprovalStatus = 'Approved'
            ))
            OR (u.Role = 'Teacher' AND EXISTS (
                SELECT 1 FROM dbo.Class_Problem cp
                JOIN dbo.Classes c ON c.ClassID = cp.ClassID
                WHERE cp.ProblemID = p.ProblemID AND c.TeacherID = @ActorID
            ))
        )
    )
        THROW 50010, N'Bạn không có quyền sửa testcase của bài tập này.', 1;

    SELECT @CurrentStatus = p.Status, @ActorRole = u.Role 
    FROM dbo.Problems p
    JOIN dbo.Users u ON u.UserID = @ActorID
    WHERE p.ProblemID = @ProblemID;

    BEGIN TRANSACTION;

    -- Nếu TA sửa testcase của bài tập đã duyệt, chuyển về Pending để duyệt lại.
    IF @ActorRole = 'TA' AND @CurrentStatus NOT IN ('Pending', 'Rejected')
    BEGIN
        UPDATE dbo.Problems 
        SET Status = 'Pending', RejectionReason = NULL, ProposedStatus = COALESCE(ProposedStatus, 'Private')
        WHERE ProblemID = @ProblemID;
    END

    DELETE FROM dbo.Testcases WHERE ProblemID = @ProblemID;

    INSERT dbo.Testcases (ProblemID, InputData, ExpectedOutput, IsHidden, OrderIndex, GroupNo)
    SELECT @ProblemID, t.input, t.expectedOutput, t.isHidden, CAST(o.[key] AS INT), t.groupNo
    FROM OPENJSON(@TestcasesJson) o
    CROSS APPLY OPENJSON(o.value) WITH (
        input NVARCHAR(MAX) '$.input',
        expectedOutput NVARCHAR(MAX) '$.expectedOutput',
        isHidden BIT '$.isHidden',
        groupNo INT '$.groupNo'
    ) t;

    IF @ScoringJson IS NOT NULL
    BEGIN
        UPDATE dbo.Problems
        SET CompareMode = COALESCE(JSON_VALUE(@ScoringJson, '$.compareMode'), 'exact'),
            FloatEpsilon = TRY_CAST(JSON_VALUE(@ScoringJson, '$.floatEpsilon') AS FLOAT)
        WHERE ProblemID = @ProblemID;

        DELETE FROM dbo.TestcaseGroups WHERE ProblemID = @ProblemID;
        INSERT dbo.TestcaseGroups (ProblemID, GroupNo, Points)
        SELECT @ProblemID, g.groupNo, g.points
        FROM OPENJSON(@ScoringJson, '$.groups') WITH (
            groupNo INT '$.groupNo',
            points INT '$.points'
        ) g;
    END

    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Problem_CheckAccess
    @ProblemID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT app.ufn_CanUserAccessProblem(@ProblemID, @UserID) AS CanAccess;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Problem_Clone
    @ProblemID INT,
    @ActorID INT,
    @NewTitle NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (
            SELECT 1 FROM dbo.Users 
            WHERE UserID = @ActorID AND Role IN ('Teacher', 'Admin')
        )
        BEGIN
            THROW 50020, 'Chi giang vien hoac quan tri vien moi co the nhan ban bai tap.', 1;
        END;

        DECLARE @SourceStatus VARCHAR(20), @SourceCreatorID INT, @OrigTitle NVARCHAR(200);
        SELECT 
            @SourceStatus = Status,
            @SourceCreatorID = CreatorID,
            @OrigTitle = Title
        FROM dbo.Problems 
        WHERE ProblemID = @ProblemID;

        IF @SourceStatus IS NULL
        BEGIN
            THROW 50021, 'Bai tap nguon khong ton tai.', 1;
        END;

        IF @SourceStatus <> 'Public' AND @SourceCreatorID <> @ActorID
           AND NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin')
        BEGIN
            THROW 50022, 'Ban khong co quyen nhan ban bai tap nay.', 1;
        END;

        DECLARE @FinalTitle NVARCHAR(200);
        IF @NewTitle IS NOT NULL AND LEN(RTRIM(LTRIM(@NewTitle))) > 0
            SET @FinalTitle = RTRIM(LTRIM(@NewTitle));
        ELSE
            SET @FinalTitle = N'[Bản sao] ' + @OrigTitle;

        IF LEN(@FinalTitle) > 200
            SET @FinalTitle = LEFT(@FinalTitle, 200);

        BEGIN TRANSACTION;

        DECLARE @NewProblemID INT;

        INSERT INTO dbo.Problems (
            CreatorID,
            Title,
            Statement,
            InputFormat,
            OutputFormat,
            TimeLimit,
            MemoryLimit,
            Tags,
            Difficulty,
            Status,
            CreatedAt
        )
        SELECT 
            @ActorID,
            @FinalTitle,
            Statement,
            InputFormat,
            OutputFormat,
            TimeLimit,
            MemoryLimit,
            Tags,
            Difficulty,
            'Private',
            SYSUTCDATETIME()
        FROM dbo.Problems
        WHERE ProblemID = @ProblemID;

        SET @NewProblemID = SCOPE_IDENTITY();

        INSERT INTO dbo.Testcases (
            ProblemID,
            InputData,
            ExpectedOutput,
            IsHidden,
            OrderIndex
        )
        SELECT 
            @NewProblemID,
            InputData,
            ExpectedOutput,
            IsHidden,
            OrderIndex
        FROM dbo.Testcases
        WHERE ProblemID = @ProblemID;

        COMMIT TRANSACTION;

        SELECT 
            p.ProblemID,
            p.Title,
            p.Difficulty,
            p.Status,
            p.CreatedAt
        FROM dbo.Problems p
        WHERE p.ProblemID = @NewProblemID;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
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



CREATE OR ALTER PROCEDURE app.usp_Problem_Create_Teacher
    @TeacherID INT,
    @Title NVARCHAR(200),
    @Statement NVARCHAR(MAX),
    @InputFormat NVARCHAR(MAX) = NULL,
    @OutputFormat NVARCHAR(MAX) = NULL,
    @TimeLimit INT = 1000,
    @MemoryLimit INT = 256,
    @Tags NVARCHAR(200) = NULL,
    @Difficulty VARCHAR(20) = 'Medium',
    @FunctionSpec NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    EXEC app.usp_Problem_Create
        @CreatorID = @TeacherID,
        @Title = @Title,
        @Statement = @Statement,
        @InputFormat = @InputFormat,
        @OutputFormat = @OutputFormat,
        @TimeLimit = @TimeLimit,
        @MemoryLimit = @MemoryLimit,
        @Tags = @Tags,
        @Difficulty = @Difficulty,
        @Status = 'Public',
        @ClassID = NULL,
        @DueDate = NULL,
        @FunctionSpec = @FunctionSpec,
        @ProposedStatus = NULL;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Problem_Create_TA
    @TA_ID INT,
    @Title NVARCHAR(200),
    @Statement NVARCHAR(MAX),
    @InputFormat NVARCHAR(MAX) = NULL,
    @OutputFormat NVARCHAR(MAX) = NULL,
    @TimeLimit INT = 1000,
    @MemoryLimit INT = 256,
    @Tags NVARCHAR(200) = NULL,
    @Difficulty VARCHAR(20) = 'Medium',
    @FunctionSpec NVARCHAR(MAX) = NULL,
    @ClassID INT = NULL      -- lớp TA được phân công; usp_Problem_Create bắt buộc có với vai TA
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    EXEC app.usp_Problem_Create
        @CreatorID = @TA_ID,
        @Title = @Title,
        @Statement = @Statement,
        @InputFormat = @InputFormat,
        @OutputFormat = @OutputFormat,
        @TimeLimit = @TimeLimit,
        @MemoryLimit = @MemoryLimit,
        @Tags = @Tags,
        @Difficulty = @Difficulty,
        @Status = 'Pending',
        @ClassID = @ClassID,
        @DueDate = NULL,
        @FunctionSpec = @FunctionSpec,
        @ProposedStatus = 'Private';
END;
GO
