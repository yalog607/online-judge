CREATE OR ALTER PROCEDURE app.usp_Class_Create
    @TeacherID INT,
    @ClassName NVARCHAR(150),
    @Description NVARCHAR(MAX) = NULL,
    @IsPublic BIT = 1,
    @InviteCode VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (
            SELECT 1 
            FROM dbo.Users 
            WHERE UserID = @TeacherID AND Role IN ('Teacher', 'Admin')
        )
        BEGIN
            THROW 50020, 'Nguoi dung khong co quyen tao lop hoc.', 1;
        END;

        IF @InviteCode IS NULL OR LEN(RTRIM(LTRIM(@InviteCode))) = 0
        BEGIN
            SET @InviteCode = UPPER(SUBSTRING(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''), 1, 8));
        END;

        WHILE EXISTS (SELECT 1 FROM dbo.Classes WHERE InviteCode = @InviteCode)
        BEGIN
            SET @InviteCode = UPPER(SUBSTRING(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''), 1, 8));
        END;

        INSERT dbo.Classes (TeacherID, InviteCode, ClassName, Description, IsPublic, ApprovalStatus)
        VALUES (@TeacherID, @InviteCode, @ClassName, @Description, @IsPublic, 'Approved');

        DECLARE @NewClassID INT = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT 
            @NewClassID AS ClassID,
            @InviteCode AS InviteCode;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_JoinByInviteCode
    @UserID INT,
    @InviteCode VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @ClassID INT;
        DECLARE @ApprovalStatus VARCHAR(20);

        SELECT 
            @ClassID = ClassID,
            @ApprovalStatus = ApprovalStatus
        FROM dbo.Classes
        WHERE InviteCode = @InviteCode;

        IF @ClassID IS NULL
        BEGIN
            THROW 50021, 'Ma tham gia lop hoc khong ton tai.', 1;
        END;

        IF @ApprovalStatus <> 'Approved'
        BEGIN
            THROW 50022, 'Lop hoc chua duoc phe duyet.', 1;
        END;

        IF EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @ClassID AND UserID = @UserID)
        BEGIN
            THROW 50023, 'Ban da tham gia lop hoc nay roi.', 1;
        END;

        INSERT dbo.Class_Student (ClassID, UserID, JoinDate, ProgressPercent)
        VALUES (@ClassID, @UserID, SYSUTCDATETIME(), 0.0);

        COMMIT TRANSACTION;

        SELECT @ClassID AS ClassID;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_Leave
    @UserID INT,
    @ClassID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @ClassID AND UserID = @UserID)
        BEGIN
            THROW 50024, 'Ban chua tham gia lop hoc nay.', 1;
        END;

        DELETE FROM dbo.Class_Student
        WHERE ClassID = @ClassID AND UserID = @UserID;

        COMMIT TRANSACTION;

        SELECT 1 AS Success;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_List
    @UserID INT = NULL,
    @Search NVARCHAR(100) = NULL,
    @OnlyMine BIT = 0,
    @Page INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    IF @Page < 1 SET @Page = 1;
    IF @PageSize < 1 SET @PageSize = 20;
    DECLARE @Offset INT = (@Page - 1) * @PageSize;

    SELECT 
        c.ClassID,
        c.TeacherID,
        c.TeacherName,
        c.TeacherEmail,
        c.InviteCode,
        c.ClassName,
        c.Description,
        c.IsPublic,
        c.ApprovalStatus,
        c.CreatedAt,
        c.StudentCount,
        CASE 
            WHEN @UserID IS NOT NULL AND app.ufn_IsStudentInClass(c.ClassID, @UserID) = 1 THEN 1 
            ELSE 0 
        END AS IsJoined,
        COUNT(*) OVER() AS TotalCount
    FROM app.uvw_ClassOverview c
    WHERE 
        (@Search IS NULL OR c.ClassName LIKE '%' + @Search + '%' OR c.TeacherName LIKE '%' + @Search + '%')
        AND (c.ApprovalStatus = 'Approved' OR c.TeacherID = @UserID)
        AND (
            (@OnlyMine = 1 AND (c.TeacherID = @UserID OR app.ufn_IsStudentInClass(c.ClassID, @UserID) = 1))
            OR
            (@OnlyMine = 0 AND (c.IsPublic = 1 OR c.TeacherID = @UserID OR app.ufn_IsStudentInClass(c.ClassID, @UserID) = 1))
        )
    ORDER BY c.CreatedAt DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_GetDetail
    @ClassID INT,
    @UserID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        c.ClassID,
        c.TeacherID,
        c.TeacherName,
        c.TeacherEmail,
        c.InviteCode,
        c.ClassName,
        c.Description,
        c.IsPublic,
        c.ApprovalStatus,
        c.CreatedAt,
        c.StudentCount,
        CASE 
            WHEN @UserID IS NOT NULL AND app.ufn_IsStudentInClass(c.ClassID, @UserID) = 1 THEN 1 
            ELSE 0 
        END AS IsJoined
    FROM app.uvw_ClassOverview c
    WHERE c.ClassID = @ClassID;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_GetStudents
    @ClassID INT,
    @ActorID INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TeacherID INT;
    DECLARE @IsPublic BIT;

    SELECT 
        @TeacherID = TeacherID,
        @IsPublic = IsPublic
    FROM dbo.Classes
    WHERE ClassID = @ClassID;

    IF @TeacherID IS NULL
    BEGIN
        THROW 50025, 'Lop hoc khong ton tai.', 1;
    END;

    IF @TeacherID <> @ActorID 
       AND app.ufn_IsStudentInClass(@ClassID, @ActorID) = 0
       AND NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin')
    BEGIN
        THROW 50026, 'Ban khong co quyen xem danh sach hoc sinh lop nay.', 1;
    END;

    SELECT 
        ClassID,
        UserID,
        Username,
        FullName,
        Email,
        JoinDate,
        ProgressPercent
    FROM app.ufn_GetClassStudentList(@ClassID)
    ORDER BY JoinDate DESC;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_GetProblems
    @ClassID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

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
            WHEN EXISTS (SELECT 1 FROM dbo.Submissions s WHERE s.ProblemID = p.ProblemID AND s.UserID = @UserID AND s.Result = 'AC') THEN 'done'
            WHEN EXISTS (SELECT 1 FROM dbo.Submissions s WHERE s.ProblemID = p.ProblemID AND s.UserID = @UserID) THEN 'tried'
            ELSE 'todo'
        END AS UserStatus
    FROM dbo.Class_Problem cp
    JOIN dbo.Problems p ON p.ProblemID = cp.ProblemID
    WHERE cp.ClassID = @ClassID
    ORDER BY cp.AssignedDate DESC;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_AddStudent
    @ClassID INT,
    @TeacherID INT,
    @Identifier VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (
            SELECT 1 
            FROM dbo.Classes c
            JOIN dbo.Users u ON u.UserID = @TeacherID
            WHERE c.ClassID = @ClassID AND (c.TeacherID = @TeacherID OR u.Role = 'Admin')
        )
        BEGIN
            THROW 50027, 'Ban khong co quyen them hoc sinh vao lop nay.', 1;
        END;

        DECLARE @StudentID INT;
        SELECT @StudentID = UserID 
        FROM dbo.Users 
        WHERE Email = @Identifier OR Username = @Identifier;

        IF @StudentID IS NULL
        BEGIN
            THROW 50028, 'Khong tim thay nguoi dung voi thong tin nay.', 1;
        END;

        IF EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @ClassID AND UserID = @StudentID)
        BEGIN
            THROW 50029, 'Hoc sinh nay da o trong lop hoc roi.', 1;
        END;

        INSERT dbo.Class_Student (ClassID, UserID, JoinDate, ProgressPercent)
        VALUES (@ClassID, @StudentID, SYSUTCDATETIME(), 0.0);

        COMMIT TRANSACTION;

        SELECT @StudentID AS StudentID;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_RemoveStudent
    @ClassID INT,
    @TeacherID INT,
    @StudentID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (
            SELECT 1 
            FROM dbo.Classes c
            JOIN dbo.Users u ON u.UserID = @TeacherID
            WHERE c.ClassID = @ClassID AND (c.TeacherID = @TeacherID OR u.Role = 'Admin')
        )
        BEGIN
            THROW 50027, 'Ban khong co quyen xoa hoc sinh khoi lop nay.', 1;
        END;

        IF NOT EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @ClassID AND UserID = @StudentID)
        BEGIN
            THROW 50030, 'Hoc sinh khong co trong lop nay.', 1;
        END;

        DELETE FROM dbo.Class_Student
        WHERE ClassID = @ClassID AND UserID = @StudentID;

        COMMIT TRANSACTION;

        SELECT 1 AS Success;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_Update
    @ClassID INT,
    @TeacherID INT,
    @ClassName NVARCHAR(150),
    @Description NVARCHAR(MAX) = NULL,
    @IsPublic BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (
            SELECT 1 
            FROM dbo.Classes c
            JOIN dbo.Users u ON u.UserID = @TeacherID
            WHERE c.ClassID = @ClassID AND (c.TeacherID = @TeacherID OR u.Role = 'Admin')
        )
        BEGIN
            THROW 50035, 'Ban khong co quyen cap nhat thong tin lop hoc nay.', 1;
        END;

        UPDATE dbo.Classes
        SET ClassName = @ClassName,
            Description = @Description,
            IsPublic = @IsPublic
        WHERE ClassID = @ClassID;

        COMMIT TRANSACTION;

        SELECT 
            ClassID,
            TeacherID,
            InviteCode,
            ClassName,
            Description,
            IsPublic,
            ApprovalStatus,
            CreatedAt
        FROM dbo.Classes
        WHERE ClassID = @ClassID;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

