IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Class_JoinRequests' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.Class_JoinRequests (
        RequestID INT IDENTITY(1,1) CONSTRAINT PK_Class_JoinRequests PRIMARY KEY,
        ClassID INT NOT NULL CONSTRAINT FK_CJR_Class REFERENCES dbo.Classes(ClassID) ON DELETE CASCADE,
        UserID INT NOT NULL CONSTRAINT FK_CJR_User REFERENCES dbo.Users(UserID) ON DELETE CASCADE,
        Message NVARCHAR(500) NOT NULL,
        Status VARCHAR(20) NOT NULL CONSTRAINT DF_CJR_Status DEFAULT 'Pending',
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_CJR_CreatedAt DEFAULT SYSUTCDATETIME(),
        ReviewedAt DATETIME2(0) NULL,
        ReviewedBy INT NULL CONSTRAINT FK_CJR_ReviewedBy REFERENCES dbo.Users(UserID),
        CONSTRAINT CK_CJR_Status CHECK (Status IN ('Pending', 'Approved', 'Rejected')),
        CONSTRAINT UQ_CJR_Class_User UNIQUE (ClassID, UserID)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CJR_Class_Status' AND object_id = OBJECT_ID('dbo.Class_JoinRequests'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_CJR_Class_Status
    ON dbo.Class_JoinRequests (ClassID, Status)
    INCLUDE (UserID, Message, CreatedAt, ReviewedAt, ReviewedBy);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CJR_User' AND object_id = OBJECT_ID('dbo.Class_JoinRequests'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_CJR_User
    ON dbo.Class_JoinRequests (UserID, Status);
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_List
    @UserID INT = NULL,
    @Search NVARCHAR(100) = NULL,
    @OnlyMine BIT = 0,
    @Page INT = 1,
    @PageSize INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;
    DECLARE @IsAdmin BIT = 0;

    IF @UserID IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role = 'Admin')
    BEGIN
        SET @IsAdmin = 1;
    END;

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
        c.IsCancelled,
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
        AND (@IsAdmin = 1 OR c.ApprovalStatus = 'Approved' OR c.TeacherID = @UserID)
        AND (
            c.IsCancelled = 0 OR @IsAdmin = 1 OR c.TeacherID = @UserID
            OR app.ufn_IsStudentInClass(c.ClassID, @UserID) = 1
            OR EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = c.ClassID AND UserID_TA = @UserID)
        )
        AND (
            @IsAdmin = 1
            OR
            (@OnlyMine = 1 AND (c.TeacherID = @UserID OR app.ufn_IsStudentInClass(c.ClassID, @UserID) = 1 OR EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = c.ClassID AND UserID_TA = @UserID)))
            OR
            (@OnlyMine = 0 AND (c.ApprovalStatus = 'Approved' OR c.TeacherID = @UserID OR app.ufn_IsStudentInClass(c.ClassID, @UserID) = 1 OR EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = c.ClassID AND UserID_TA = @UserID)))
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
        c.IsCancelled,
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
        (SELECT TOP (1) Status FROM dbo.Class_JoinRequests WHERE ClassID = c.ClassID AND UserID = @UserID) AS JoinRequestStatus,
        (SELECT TOP (1) Message FROM dbo.Class_JoinRequests WHERE ClassID = c.ClassID AND UserID = @UserID) AS JoinRequestMessage,
        (SELECT COUNT(*) FROM dbo.Class_JoinRequests WHERE ClassID = c.ClassID AND Status = 'Pending') AS PendingRequestCount
    FROM app.uvw_ClassOverview c
    WHERE c.ClassID = @ClassID;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_RequestJoin
    @UserID INT,
    @ClassID INT,
    @Message NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ApprovalStatus VARCHAR(20), @IsPublic BIT, @IsCancelled BIT;
    SELECT 
        @ApprovalStatus = ApprovalStatus,
        @IsPublic = IsPublic,
        @IsCancelled = IsCancelled
    FROM dbo.Classes
    WHERE ClassID = @ClassID;

    IF @ApprovalStatus IS NULL
        THROW 50021, N'Lớp học không tồn tại.', 1;

    IF @ApprovalStatus <> 'Approved'
        THROW 50022, N'Lớp học chưa được phê duyệt.', 1;

    IF @IsCancelled = 1
        THROW 50041, N'Lớp học đã bị hủy.', 1;

    IF EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @ClassID AND UserID = @UserID)
        THROW 50023, N'Bạn đã tham gia lớp học này rồi.', 1;

    IF @IsPublic = 1
    BEGIN
        INSERT dbo.Class_Student (ClassID, UserID, JoinDate, ProgressPercent)
        VALUES (@ClassID, @UserID, SYSUTCDATETIME(), 0.0);
        SELECT @ClassID AS ClassID, 'Joined' AS Status;
        RETURN;
    END;

    IF LEN(LTRIM(RTRIM(ISNULL(@Message, '')))) = 0
        THROW 50024, N'Vui lòng nhập thông tin gửi giảng viên.', 1;

    IF EXISTS (SELECT 1 FROM dbo.Class_JoinRequests WHERE ClassID = @ClassID AND UserID = @UserID)
    BEGIN
        UPDATE dbo.Class_JoinRequests
        SET Message = LTRIM(RTRIM(@Message)),
            Status = 'Pending',
            CreatedAt = SYSUTCDATETIME(),
            ReviewedAt = NULL,
            ReviewedBy = NULL
        WHERE ClassID = @ClassID AND UserID = @UserID;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.Class_JoinRequests (ClassID, UserID, Message, Status, CreatedAt)
        VALUES (@ClassID, @UserID, LTRIM(RTRIM(@Message)), 'Pending', SYSUTCDATETIME());
    END;

    SELECT @ClassID AS ClassID, 'Pending' AS Status;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_CancelJoinRequest
    @UserID INT,
    @ClassID INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.Class_JoinRequests
    WHERE ClassID = @ClassID AND UserID = @UserID AND Status = 'Pending';
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_ListJoinRequests
    @ClassID INT,
    @ActorID INT,
    @Status VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND TeacherID = @ActorID
        UNION ALL
        SELECT 1 FROM dbo.Class_TA WHERE ClassID = @ClassID AND UserID_TA = @ActorID
        UNION ALL
        SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin'
    )
        THROW 50026, N'Bạn không có quyền quản lý yêu cầu tham gia của lớp này.', 1;

    SELECT 
        r.RequestID,
        r.ClassID,
        r.UserID,
        u.Username,
        u.FullName,
        u.Email,
        r.Message,
        r.Status,
        r.CreatedAt,
        r.ReviewedAt,
        r.ReviewedBy,
        rev.FullName AS ReviewerName
    FROM dbo.Class_JoinRequests r
    JOIN dbo.Users u ON u.UserID = r.UserID
    LEFT JOIN dbo.Users rev ON rev.UserID = r.ReviewedBy
    WHERE r.ClassID = @ClassID
      AND (@Status IS NULL OR @Status = '' OR r.Status = @Status)
    ORDER BY 
        CASE WHEN r.Status = 'Pending' THEN 0 ELSE 1 END,
        r.CreatedAt DESC;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Class_ReviewJoinRequest
    @RequestID INT,
    @ActorID INT,
    @Action VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ClassID INT, @UserID INT, @CurrentStatus VARCHAR(20);
    SELECT 
        @ClassID = r.ClassID,
        @UserID = r.UserID,
        @CurrentStatus = r.Status
    FROM dbo.Class_JoinRequests r
    WHERE r.RequestID = @RequestID;

    IF @ClassID IS NULL
        THROW 50027, N'Yêu cầu tham gia không tồn tại.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND TeacherID = @ActorID
        UNION ALL
        SELECT 1 FROM dbo.Class_TA WHERE ClassID = @ClassID AND UserID_TA = @ActorID
        UNION ALL
        SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin'
    )
        THROW 50026, N'Bạn không có quyền duyệt yêu cầu của lớp này.', 1;

    IF @CurrentStatus <> 'Pending'
        THROW 50028, N'Yêu cầu này đã được xử lý trước đó.', 1;

    IF @Action NOT IN ('Approve', 'Reject')
        THROW 50029, N'Thao tác không hợp lệ.', 1;

    IF @Action = 'Approve'
    BEGIN
        UPDATE dbo.Class_JoinRequests
        SET Status = 'Approved',
            ReviewedAt = SYSUTCDATETIME(),
            ReviewedBy = @ActorID
        WHERE RequestID = @RequestID;

        IF NOT EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @ClassID AND UserID = @UserID)
        BEGIN
            INSERT INTO dbo.Class_Student (ClassID, UserID, JoinDate, ProgressPercent)
            VALUES (@ClassID, @UserID, SYSUTCDATETIME(), 0.0);
        END;
    END
    ELSE IF @Action = 'Reject'
    BEGIN
        UPDATE dbo.Class_JoinRequests
        SET Status = 'Rejected',
            ReviewedAt = SYSUTCDATETIME(),
            ReviewedBy = @ActorID
        WHERE RequestID = @RequestID;
    END;

    SELECT @RequestID AS RequestID, @ClassID AS ClassID, @UserID AS UserID, @Action AS Action;
END;
GO
