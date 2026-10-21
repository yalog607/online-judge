IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db_ta' AND type = 'R')
    CREATE ROLE db_ta AUTHORIZATION dbo;
GO

GRANT SELECT ON dbo.Problems TO db_ta;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Documents TO db_ta;
DENY DELETE ON dbo.Classes TO db_ta;
GO

GRANT SELECT ON dbo.Users (UserID, Username, FullName, Email, Role, Status) TO db_ta;
DENY SELECT ON dbo.Users (Password) TO db_ta;
GO

CREATE OR ALTER VIEW app.uvw_PublicProblems_Security
AS
SELECT ProblemID, Title, Difficulty, TimeLimit, MemoryLimit, Status
FROM dbo.Problems
WHERE Status = 'Public'
WITH CHECK OPTION;
GO

GRANT SELECT ON app.uvw_PublicProblems_Security TO db_student;
GO

CREATE OR ALTER VIEW dbo.vw_UserSubmissionStats
AS
SELECT 
    UserID,
    COUNT(SubmissionID) AS TotalSubmissions,
    SUM(CASE WHEN Result = 'AC' THEN 1 ELSE 0 END) AS TotalAC,
    SUM(CASE WHEN Result = 'WA' THEN 1 ELSE 0 END) AS TotalWA,
    SUM(CASE WHEN Result = 'TLE' THEN 1 ELSE 0 END) AS TotalTLE,
    SUM(CASE WHEN Result = 'RE' THEN 1 ELSE 0 END) AS TotalRE,
    SUM(CASE WHEN Result = 'CE' THEN 1 ELSE 0 END) AS TotalCE
FROM dbo.Submissions
GROUP BY UserID;
GO

CREATE OR ALTER VIEW dbo.vw_UserLeaderboard
AS
SELECT 
    u.UserID, 
    u.Username, 
    u.FullName, 
    COUNT(DISTINCT CASE WHEN s.Result = 'AC' THEN s.ProblemID END) AS SolvedProblems,
    ISNULL(SUM(cu.TotalScore), 0) AS TotalScore
FROM dbo.Users u
LEFT JOIN dbo.Submissions s ON u.UserID = s.UserID
LEFT JOIN dbo.Contest_User cu ON u.UserID = cu.UserID
WHERE u.Role = 'User' AND u.Status = 'Active'
GROUP BY u.UserID, u.Username, u.FullName;
GO

CREATE OR ALTER VIEW app.uvw_ClassDocumentOverview
AS
SELECT 
    d.DocumentID,
    d.ClassID,
    c.ClassName,
    d.FileName,
    d.CloudinaryURL,
    d.Category,
    d.UploadDate,
    u.FullName AS TeacherName,
    u.Email AS TeacherEmail
FROM dbo.Documents d
INNER JOIN dbo.Classes c ON d.ClassID = c.ClassID
INNER JOIN dbo.Users u ON c.TeacherID = u.UserID;
GO

CREATE OR ALTER VIEW dbo.vw_RecentSubmissions
AS
SELECT TOP 100
    s.SubmissionID,
    u.Username,
    p.Title AS ProblemTitle,
    s.Language,
    s.Result,
    s.Runtime,
    s.Memory,
    s.SubmitTime
FROM dbo.Submissions s
JOIN dbo.Users u ON s.UserID = u.UserID
JOIN dbo.Problems p ON s.ProblemID = p.ProblemID
ORDER BY s.SubmitTime DESC;
GO

CREATE OR ALTER VIEW dbo.vw_ContestStandings
AS
SELECT 
    cu.ContestID,
    c.ContestName,
    cu.UserID,
    u.Username,
    u.FullName,
    cu.TotalScore,
    cu.PenaltyTime,
    DENSE_RANK() OVER (
        PARTITION BY cu.ContestID 
        ORDER BY cu.TotalScore DESC, cu.PenaltyTime ASC
    ) AS LiveRank
FROM dbo.Contest_User cu
INNER JOIN dbo.Contests c ON cu.ContestID = c.ContestID
INNER JOIN dbo.Users u ON cu.UserID = u.UserID;
GO

CREATE OR ALTER FUNCTION dbo.udf_CalculatePenaltyTime
(
    @StartTime DATETIME2(0), 
    @SubmitTime DATETIME2(0), 
    @WrongCount INT
)
RETURNS INT
AS
BEGIN
    DECLARE @PenaltyMinutes INT;
    SET @PenaltyMinutes = DATEDIFF(MINUTE, @StartTime, @SubmitTime) + (@WrongCount * 20);
    RETURN @PenaltyMinutes;
END;
GO

CREATE OR ALTER FUNCTION dbo.udf_GetProblemACRate
(
    @ProblemID INT
)
RETURNS DECIMAL(5, 2)
AS
BEGIN
    DECLARE @Total INT, @AC INT;
    SELECT @Total = COUNT(*) FROM dbo.Submissions WHERE ProblemID = @ProblemID;
    IF @Total = 0 RETURN 0.00;
    
    SELECT @AC = COUNT(*) FROM dbo.Submissions WHERE ProblemID = @ProblemID AND Result = 'AC';
    RETURN CAST((@AC * 100.0 / @Total) AS DECIMAL(5, 2));
END;
GO

CREATE OR ALTER FUNCTION dbo.udf_GetRemainingTime
(
    @ContestID INT
)
RETURNS INT
AS
BEGIN
    DECLARE @Remaining INT;
    SELECT @Remaining = DATEDIFF(MINUTE, SYSUTCDATETIME(), EndTime)
    FROM dbo.Contests
    WHERE ContestID = @ContestID;
    
    IF @Remaining < 0 SET @Remaining = 0;
    RETURN @Remaining;
END;
GO

CREATE OR ALTER FUNCTION dbo.udf_GetTotalScore
(
    @UserID INT
)
RETURNS INT
AS
BEGIN
    DECLARE @Score INT;
    SELECT @Score = ISNULL(SUM(TotalScore), 0)
    FROM dbo.Contest_User
    WHERE UserID = @UserID;
    RETURN @Score;
END;
GO

CREATE OR ALTER FUNCTION dbo.udf_IsContestRunning
(
    @ContestID INT
)
RETURNS BIT
AS
BEGIN
    DECLARE @IsRunning BIT = 0;
    IF EXISTS (
        SELECT 1 FROM dbo.Contests 
        WHERE ContestID = @ContestID 
          AND StartTime <= SYSUTCDATETIME() 
          AND EndTime >= SYSUTCDATETIME()
    )
        SET @IsRunning = 1;
    RETURN @IsRunning;
END;
GO

CREATE OR ALTER FUNCTION app.ufn_GetClassDocuments
(
    @ClassID INT
)
RETURNS TABLE
AS
RETURN
(
    SELECT 
        d.DocumentID,
        d.ClassID,
        d.FileName,
        d.CloudinaryURL,
        d.Category,
        d.UploadDate
    FROM dbo.Documents d
    WHERE d.ClassID = @ClassID
);
GO

CREATE OR ALTER FUNCTION app.ufn_GetClassStudentCount
(
    @ClassID INT
)
RETURNS INT
AS
BEGIN
    DECLARE @TotalStudents INT = 0;
    SELECT @TotalStudents = COUNT(*) 
    FROM dbo.Class_Student 
    WHERE ClassID = @ClassID;

    RETURN @TotalStudents;
END;
GO

CREATE OR ALTER FUNCTION app.ufn_GetProblemAcRate
(
    @ProblemID INT
)
RETURNS FLOAT
AS
BEGIN
    DECLARE @Rate FLOAT = 0.0;
    DECLARE @TotalSubmissions INT = 0;
    DECLARE @TotalAc INT = 0;

    SELECT 
        @TotalSubmissions = COUNT(*),
        @TotalAc = SUM(CASE WHEN Result = 'AC' THEN 1 ELSE 0 END)
    FROM dbo.Submissions
    WHERE ProblemID = @ProblemID;

    IF @TotalSubmissions > 0
        SET @Rate = CAST(@TotalAc AS FLOAT) * 100.0 / CAST(@TotalSubmissions AS FLOAT);

    RETURN @Rate;
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_Class_JoinRequest_AuditLog
ON dbo.Class_JoinRequests
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO dbo.AuditLog (ActorID, Action, TargetType, TargetID, Detail)
        SELECT i.UserID, 'REQUEST_JOIN_CLASS', 'Class_JoinRequests', i.RequestID, 
               CONCAT('Student applied for ClassID: ', i.ClassID)
        FROM inserted i;
    END
    ELSE IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO dbo.AuditLog (ActorID, Action, TargetType, TargetID, Detail)
        SELECT i.ReviewedBy, CONCAT('REVIEW_JOIN_REQUEST_', i.Status), 'Class_JoinRequests', i.RequestID,
               CONCAT('Status changed to ', i.Status, ' for Student UserID: ', i.UserID)
        FROM inserted i
        JOIN deleted d ON i.RequestID = d.RequestID
        WHERE i.Status <> d.Status;
    END
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Comment_Create
    @ProblemID INT = NULL,
    @ContestID INT = NULL,
    @UserID INT,
    @Content NVARCHAR(2000),
    @ParentID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    EXEC app.usp_Comment_Add
        @ProblemID = @ProblemID,
        @ContestID = @ContestID,
        @UserID = @UserID,
        @ParentID = @ParentID,
        @Content = @Content;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Admin_ChangeUserRole
    @AdminID INT,
    @TargetUserID INT,
    @NewRole VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    EXEC app.usp_Admin_SetUserRole
        @AdminID = @AdminID,
        @TargetUserID = @TargetUserID,
        @Role = @NewRole;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Admin_DemoteTeacher
    @AdminID INT,
    @TeacherID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @AdminID AND Role = 'Admin')
            THROW 50018, N'Chi co quan tri vien toi cao moi duoc quyen giang chuc giang vien.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.Classes
        SET TeacherID = @AdminID
        WHERE TeacherID = @TeacherID;

        UPDATE dbo.Problems
        SET CreatorID = @AdminID
        WHERE CreatorID = @TeacherID;

        UPDATE dbo.Users
        SET Role = 'User'
        WHERE UserID = @TeacherID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
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
    @FunctionSpec NVARCHAR(MAX) = NULL
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
        @ClassID = NULL,
        @DueDate = NULL,
        @FunctionSpec = @FunctionSpec,
        @ProposedStatus = 'Private';
END;
GO
