CREATE OR ALTER PROCEDURE app.usp_Problem_Create
    @CreatorID INT,
    @Title NVARCHAR(200),
    @Statement NVARCHAR(MAX),
    @InputFormat NVARCHAR(MAX),
    @OutputFormat NVARCHAR(MAX),
    @TimeLimit INT,
    @MemoryLimit INT,
    @Tags NVARCHAR(200),
    @Difficulty VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT dbo.Problems (CreatorID, Title, Statement, InputFormat, OutputFormat, TimeLimit, MemoryLimit, Tags, Difficulty)
    VALUES (@CreatorID, @Title, @Statement, @InputFormat, @OutputFormat, @TimeLimit, @MemoryLimit, @Tags, @Difficulty);
    SELECT SCOPE_IDENTITY() AS ProblemID;
END
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
    @Difficulty VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (
        SELECT 1 FROM dbo.Problems p
        JOIN dbo.Users u ON u.UserID = @ActorID
        WHERE p.ProblemID = @ProblemID AND (u.Role = 'Admin' OR p.CreatorID = @ActorID)
    )
        THROW 50010, 'Ban khong co quyen sua bai tap nay.', 1;

    UPDATE dbo.Problems
    SET Title = @Title, Statement = @Statement, InputFormat = @InputFormat,
        OutputFormat = @OutputFormat, TimeLimit = @TimeLimit, MemoryLimit = @MemoryLimit,
        Tags = @Tags, Difficulty = @Difficulty
    WHERE ProblemID = @ProblemID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Problem_SetStatus
    @ProblemID INT,
    @ActorID INT,
    @Status VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (
        SELECT 1 FROM dbo.Problems p
        JOIN dbo.Users u ON u.UserID = @ActorID
        WHERE p.ProblemID = @ProblemID AND (u.Role = 'Admin' OR p.CreatorID = @ActorID)
    )
        THROW 50010, 'Ban khong co quyen thay doi bai tap nay.', 1;

    UPDATE dbo.Problems SET Status = @Status WHERE ProblemID = @ProblemID;
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
        WHERE p.ProblemID = @ProblemID AND (u.Role = 'Admin' OR p.CreatorID = @ActorID)
    )
        THROW 50010, 'Ban khong co quyen xoa bai tap nay.', 1;

    IF EXISTS (SELECT 1 FROM dbo.Submissions WHERE ProblemID = @ProblemID)
        THROW 50011, 'Bai tap da co bai nop, hay khoa thay vi xoa.', 1;

    DELETE FROM dbo.Testcases WHERE ProblemID = @ProblemID;
    DELETE FROM dbo.Problems WHERE ProblemID = @ProblemID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Problem_Get
    @ProblemID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ProblemID, CreatorID, Title, Statement, InputFormat, OutputFormat,
           TimeLimit, MemoryLimit, Tags, Difficulty, Status
    FROM dbo.Problems WHERE ProblemID = @ProblemID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Problem_ListForUser
    @UserID INT,
    @Search NVARCHAR(200) = NULL,
    @Tag NVARCHAR(50) = NULL,
    @Difficulty VARCHAR(20) = NULL,
    @UserStatus VARCHAR(10) = NULL,
    @Page INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    WITH Base AS (
        SELECT
            p.ProblemID, p.Title, p.Tags, p.Difficulty,
            ROUND(COALESCE(r.AcRate, 0), 0) AS AcRate,
            CASE
                WHEN EXISTS (SELECT 1 FROM dbo.Submissions s WHERE s.ProblemID = p.ProblemID AND s.UserID = @UserID AND s.Result = 'AC') THEN 'done'
                WHEN EXISTS (SELECT 1 FROM dbo.Submissions s WHERE s.ProblemID = p.ProblemID AND s.UserID = @UserID) THEN 'tried'
                ELSE 'todo'
            END AS UserStatus
        FROM dbo.Problems p
        LEFT JOIN dbo.vw_ProblemAcRate r ON r.ProblemID = p.ProblemID
        WHERE p.Status = 'Public'
          AND (@Search IS NULL OR p.Title LIKE '%' + @Search + '%')
          AND (@Tag IS NULL OR ',' + p.Tags + ',' LIKE '%,' + @Tag + ',%')
          AND (@Difficulty IS NULL OR p.Difficulty = @Difficulty)
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
    @Difficulty VARCHAR(20) = NULL,
    @Status VARCHAR(20) = NULL,
    @Page INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @IsAdmin BIT = (SELECT CASE WHEN Role = 'Admin' THEN 1 ELSE 0 END FROM dbo.Users WHERE UserID = @ActorID);

    SELECT p.ProblemID, p.Title, p.Tags, p.Difficulty, p.Status, p.CreatedAt,
           COUNT(*) OVER () AS TotalCount
    FROM dbo.Problems p
    WHERE (@IsAdmin = 1 OR p.CreatorID = @ActorID)
      AND (@Search IS NULL OR p.Title LIKE '%' + @Search + '%')
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
        WHERE p.ProblemID = @ProblemID AND (u.Role = 'Admin' OR p.CreatorID = @ActorID)
    )
        THROW 50010, 'Ban khong co quyen xem testcase cua bai tap nay.', 1;

    SELECT TestCaseID, InputData, ExpectedOutput, IsHidden, OrderIndex
    FROM dbo.Testcases WHERE ProblemID = @ProblemID
    ORDER BY OrderIndex;
END
GO

-- @TestcasesJson: [{"input":"...","expectedOutput":"...","isHidden":true}, ...]
CREATE OR ALTER PROCEDURE app.usp_Testcase_ReplaceAll
    @ProblemID INT,
    @ActorID INT,
    @TestcasesJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Problems p
        JOIN dbo.Users u ON u.UserID = @ActorID
        WHERE p.ProblemID = @ProblemID AND (u.Role = 'Admin' OR p.CreatorID = @ActorID)
    )
        THROW 50010, 'Ban khong co quyen sua testcase cua bai tap nay.', 1;

    BEGIN TRANSACTION;

    DELETE FROM dbo.Testcases WHERE ProblemID = @ProblemID;

    INSERT dbo.Testcases (ProblemID, InputData, ExpectedOutput, IsHidden, OrderIndex)
    SELECT @ProblemID, t.input, t.expectedOutput, t.isHidden, CAST(o.[key] AS INT)
    FROM OPENJSON(@TestcasesJson) o
    CROSS APPLY OPENJSON(o.value) WITH (
        input NVARCHAR(MAX) '$.input',
        expectedOutput NVARCHAR(MAX) '$.expectedOutput',
        isHidden BIT '$.isHidden'
    ) t;

    COMMIT TRANSACTION;
END
GO
