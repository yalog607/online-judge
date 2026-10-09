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

        DECLARE @UserRole VARCHAR(20);
        SELECT @UserRole = Role FROM dbo.Users WHERE UserID = @TeacherID;
        
        DECLARE @InitialStatus VARCHAR(20) = CASE WHEN @UserRole = 'Admin' THEN 'Approved' ELSE 'Pending' END;

        INSERT dbo.Classes (TeacherID, InviteCode, ClassName, Description, IsPublic, ApprovalStatus)
        VALUES (@TeacherID, @InviteCode, @ClassName, @Description, @IsPublic, @InitialStatus);

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
        c.RejectionReason,
        c.CreatedAt,
        c.StudentCount,
        CASE 
            WHEN @UserID IS NOT NULL AND app.ufn_IsStudentInClass(c.ClassID, @UserID) = 1 THEN 1 
            ELSE 0 
        END AS IsJoined,
        CASE 
            WHEN @UserID IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = c.ClassID AND UserID_TA = @UserID) THEN 1 
            ELSE 0 
        END AS IsTA,
        COUNT(*) OVER() AS TotalCount
    FROM app.uvw_ClassOverview c
    WHERE 
        (@Search IS NULL OR c.ClassName LIKE '%' + @Search + '%' OR c.TeacherName LIKE '%' + @Search + '%')
        AND (c.ApprovalStatus = 'Approved' OR c.TeacherID = @UserID)
        AND (
            (@OnlyMine = 1 AND (c.TeacherID = @UserID OR app.ufn_IsStudentInClass(c.ClassID, @UserID) = 1 OR EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = c.ClassID AND UserID_TA = @UserID)))
            OR
            (@OnlyMine = 0 AND (c.IsPublic = 1 OR c.TeacherID = @UserID OR app.ufn_IsStudentInClass(c.ClassID, @UserID) = 1 OR EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = c.ClassID AND UserID_TA = @UserID)))
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
        c.RejectionReason,
        c.CreatedAt,
        c.StudentCount,
        CASE 
            WHEN @UserID IS NOT NULL AND app.ufn_IsStudentInClass(c.ClassID, @UserID) = 1 THEN 1 
            ELSE 0 
        END AS IsJoined,
        CASE 
            WHEN @UserID IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = c.ClassID AND UserID_TA = @UserID) THEN 1 
            ELSE 0 
        END AS IsTA
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
       AND NOT EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = @ClassID AND UserID_TA = @ActorID)
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
        ProgressPercent,
        IsTA
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
        p.Status,
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
    WHERE cp.ClassID = @ClassID AND (
        p.Status IN ('Public', 'Private') OR 
        EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND TeacherID = @UserID) OR 
        EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role = 'Admin') OR 
        EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = @ClassID AND UserID_TA = @UserID)
    )
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
            WHERE c.ClassID = @ClassID AND (
                c.TeacherID = @TeacherID OR 
                u.Role = 'Admin' OR
                EXISTS (SELECT 1 FROM dbo.Class_TA ta WHERE ta.ClassID = c.ClassID AND ta.UserID_TA = @TeacherID)
            )
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
            WHERE c.ClassID = @ClassID AND (
                c.TeacherID = @TeacherID OR 
                u.Role = 'Admin' OR
                EXISTS (SELECT 1 FROM dbo.Class_TA ta WHERE ta.ClassID = c.ClassID AND ta.UserID_TA = @TeacherID)
            )
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
            WHERE c.ClassID = @ClassID AND (
                c.TeacherID = @TeacherID OR 
                u.Role = 'Admin' OR
                EXISTS (SELECT 1 FROM dbo.Class_TA ta WHERE ta.ClassID = c.ClassID AND ta.UserID_TA = @TeacherID)
            )
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

CREATE OR ALTER PROCEDURE app.usp_Class_AssignProblem
    @ClassID INT,
    @ProblemID INT,
    @TeacherID INT,
    @DueDate DATETIME2(0) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 
        FROM dbo.Classes c
        JOIN dbo.Users u ON u.UserID = @TeacherID
        WHERE c.ClassID = @ClassID AND (
            c.TeacherID = @TeacherID OR 
            u.Role = 'Admin' OR
            EXISTS (SELECT 1 FROM dbo.Class_TA ta WHERE ta.ClassID = c.ClassID AND ta.UserID_TA = @TeacherID)
        )
    )
        THROW 50027, 'Ban khong co quyen giao bai tap cho lop hoc nay.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID)
        THROW 50028, 'Bai tap khong ton tai.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.Problems 
        WHERE ProblemID = @ProblemID AND Status = 'Hidden'
    )
        THROW 50033, 'Khong the giao bai tap da bi khoa.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF EXISTS (SELECT 1 FROM dbo.Class_Problem WHERE ClassID = @ClassID AND ProblemID = @ProblemID)
        BEGIN
            UPDATE dbo.Class_Problem
            SET DueDate = @DueDate
            WHERE ClassID = @ClassID AND ProblemID = @ProblemID;
        END
        ELSE
        BEGIN
            INSERT dbo.Class_Problem (ClassID, ProblemID, AssignedDate, DueDate, IsClosed)
            VALUES (@ClassID, @ProblemID, SYSUTCDATETIME(), @DueDate, 0);
        END;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_RemoveProblem
    @ClassID INT,
    @ProblemID INT,
    @TeacherID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 
        FROM dbo.Classes c
        JOIN dbo.Users u ON u.UserID = @TeacherID
        WHERE c.ClassID = @ClassID AND (
            c.TeacherID = @TeacherID OR 
            u.Role = 'Admin' OR
            EXISTS (SELECT 1 FROM dbo.Class_TA ta WHERE ta.ClassID = c.ClassID AND ta.UserID_TA = @TeacherID)
        )
    )
        THROW 50027, 'Ban khong co quyen go bai tap khoi lop hoc nay.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        DELETE FROM dbo.Class_Problem
        WHERE ClassID = @ClassID AND ProblemID = @ProblemID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_RequestUpgradeToTA
    @ClassID INT,
    @UserID INT,
    @TeacherID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 
        FROM dbo.Classes c
        JOIN dbo.Users u ON u.UserID = @TeacherID
        WHERE c.ClassID = @ClassID AND (c.TeacherID = @TeacherID OR u.Role = 'Admin')
    )
        THROW 50027, 'Ban khong co quyen gui yeu cau nang cap cho lop nay.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @ClassID AND UserID = @UserID)
        THROW 50030, 'Nguoi nay khong co trong lop hoc.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;
        IF NOT EXISTS (SELECT 1 FROM dbo.TA_Requests WHERE ClassID = @ClassID AND UserID = @UserID AND Status = 'Pending')
        BEGIN
            INSERT dbo.TA_Requests (ClassID, UserID, RequestedBy)
            VALUES (@ClassID, @UserID, @TeacherID);
        END
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Admin_ApproveTA
    @RequestID INT,
    @AdminID INT,
    @IsApproved BIT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @AdminID AND Role = 'Admin')
        THROW 50031, 'Ban khong co quyen phe duyet.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;
        
        DECLARE @ClassID INT, @UserID INT;
        SELECT @ClassID = ClassID, @UserID = UserID FROM dbo.TA_Requests WHERE RequestID = @RequestID AND Status = 'Pending';
        
        IF @ClassID IS NOT NULL
        BEGIN
            IF @IsApproved = 1
            BEGIN
                UPDATE dbo.TA_Requests SET Status = 'Approved' WHERE RequestID = @RequestID;
                IF NOT EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = @ClassID AND UserID_TA = @UserID)
                    INSERT dbo.Class_TA (ClassID, UserID_TA) VALUES (@ClassID, @UserID);
                
                -- Upgrade role if they are currently just a 'User'
                UPDATE dbo.Users SET Role = 'TA' WHERE UserID = @UserID AND Role = 'User';
            END
            ELSE
            BEGIN
                UPDATE dbo.TA_Requests SET Status = 'Rejected' WHERE RequestID = @RequestID;
            END
        END
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_DowngradeFromTA
    @ClassID INT,
    @UserID INT,
    @TeacherID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 
        FROM dbo.Classes c
        JOIN dbo.Users u ON u.UserID = @TeacherID
        WHERE c.ClassID = @ClassID AND (c.TeacherID = @TeacherID OR u.Role = 'Admin')
    )
        THROW 50027, 'Ban khong co quyen go bo TA khoi lop nay.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;
        
        DELETE FROM dbo.Class_TA WHERE ClassID = @ClassID AND UserID_TA = @UserID;
        
        -- If user is no longer a TA in any class, and they are a TA, downgrade them to User
        IF NOT EXISTS (SELECT 1 FROM dbo.Class_TA WHERE UserID_TA = @UserID)
           AND EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role = 'TA')
        BEGIN
            UPDATE dbo.Users SET Role = 'User' WHERE UserID = @UserID;
        END
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_GetForTA
    @TAUserID INT
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
        c.RejectionReason,
        c.CreatedAt,
        c.StudentCount,
        0 AS IsJoined
    FROM app.uvw_ClassOverview c
    JOIN dbo.Class_TA ta ON ta.ClassID = c.ClassID
    WHERE ta.UserID_TA = @TAUserID;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Admin_ListTARequests
    @AdminID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @AdminID AND Role = 'Admin')
        THROW 50031, 'Ban khong co quyen truy cap.', 1;

    SELECT 
        r.RequestID,
        r.ClassID,
        c.ClassName,
        r.UserID AS StudentID,
        u.FullName AS StudentName,
        r.RequestedBy AS TeacherID,
        t.FullName AS TeacherName,
        r.RequestDate,
        r.Status
    FROM dbo.TA_Requests r
    JOIN dbo.Classes c ON r.ClassID = c.ClassID
    JOIN dbo.Users u ON r.UserID = u.UserID
    JOIN dbo.Users t ON r.RequestedBy = t.UserID
    ORDER BY CASE WHEN r.Status = 'Pending' THEN 0 ELSE 1 END, r.RequestDate DESC;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_JoinPublic
    @UserID INT,
    @ClassID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @ApprovalStatus VARCHAR(20);
        DECLARE @IsPublic BIT;

        SELECT 
            @ApprovalStatus = ApprovalStatus,
            @IsPublic = IsPublic
        FROM dbo.Classes
        WHERE ClassID = @ClassID;

        IF @ApprovalStatus IS NULL
        BEGIN
            THROW 50021, 'Lop hoc khong ton tai.', 1;
        END;

        IF @ApprovalStatus <> 'Approved'
        BEGIN
            THROW 50022, 'Lop hoc chua duoc phe duyet.', 1;
        END;

        IF @IsPublic = 0
        BEGIN
            THROW 50024, 'Day khong phai la lop hoc cong khai.', 1;
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


CREATE OR ALTER PROCEDURE app.usp_Admin_ListClassRequests
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        c.ClassID,
        c.ClassName,
        c.TeacherID,
        t.FullName AS TeacherName,
        c.CreatedAt,
        c.ApprovalStatus
    FROM dbo.Classes c
    JOIN dbo.Users t ON c.TeacherID = t.UserID
    WHERE c.ApprovalStatus = 'Pending'
    ORDER BY c.CreatedAt DESC;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Admin_ReviewClass
    @ClassID INT,
    @AdminID INT,
    @IsApproved BIT,
    @RejectionReason NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @AdminID AND Role = 'Admin')
        THROW 50020, 'Nguoi dung khong co quyen admin.', 1;

    DECLARE @Status VARCHAR(20) = CASE WHEN @IsApproved = 1 THEN 'Approved' ELSE 'Rejected' END;

    UPDATE dbo.Classes
    SET ApprovalStatus = @Status,
        RejectionReason = CASE WHEN @IsApproved = 0 THEN @RejectionReason ELSE NULL END
    WHERE ClassID = @ClassID AND ApprovalStatus = 'Pending';

    IF @@ROWCOUNT = 0
        THROW 50040, 'Khong tim thay yeu cau hoac da duoc xu ly.', 1;
END;
GO

