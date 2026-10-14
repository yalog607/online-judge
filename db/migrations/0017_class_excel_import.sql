CREATE OR ALTER PROCEDURE app.usp_Class_ImportStudents
    @ClassID INT,
    @ActorID INT,
    @StudentsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @TeacherID INT;
        SELECT @TeacherID = c.TeacherID
        FROM dbo.Classes c
        JOIN dbo.Users u ON u.UserID = @ActorID
        WHERE c.ClassID = @ClassID AND c.IsCancelled = 0 AND (
            c.TeacherID = @ActorID OR 
            u.Role = 'Admin' OR
            EXISTS (SELECT 1 FROM dbo.Class_TA ta WHERE ta.ClassID = c.ClassID AND ta.UserID_TA = @ActorID)
        );

        IF @TeacherID IS NULL
        BEGIN
            THROW 50027, 'Ban khong co quyen them hoc sinh vao lop nay.', 1;
        END;

        DECLARE @RawList TABLE (
            RowOrder INT IDENTITY(1,1),
            Identifier NVARCHAR(255)
        );

        INSERT INTO @RawList (Identifier)
        SELECT LTRIM(RTRIM(identifier))
        FROM OPENJSON(@StudentsJson)
        WITH (
            identifier NVARCHAR(255) '$.identifier'
        )
        WHERE identifier IS NOT NULL AND LTRIM(RTRIM(identifier)) <> '';

        DECLARE @Results TABLE (
            RowOrder INT,
            Identifier NVARCHAR(255),
            UserID INT NULL,
            Username NVARCHAR(50) NULL,
            FullName NVARCHAR(100) NULL,
            Email NVARCHAR(100) NULL,
            Status VARCHAR(30)
        );

        INSERT INTO @Results (RowOrder, Identifier, UserID, Username, FullName, Email, Status)
        SELECT 
            r.RowOrder,
            r.Identifier,
            u.UserID,
            u.Username,
            u.FullName,
            u.Email,
            CASE 
                WHEN u.UserID IS NULL THEN 'NOT_FOUND'
                WHEN u.UserID = @TeacherID THEN 'CANNOT_ADD_TEACHER'
                WHEN EXISTS (SELECT 1 FROM dbo.Class_Student cs WHERE cs.ClassID = @ClassID AND cs.UserID = u.UserID) THEN 'ALREADY_EXISTS'
                WHEN ROW_NUMBER() OVER(PARTITION BY u.UserID ORDER BY r.RowOrder) > 1 THEN 'DUPLICATE_IN_FILE'
                ELSE 'SUCCESS'
            END
        FROM @RawList r
        OUTER APPLY (
            SELECT TOP 1 u2.UserID, u2.Username, u2.FullName, u2.Email
            FROM dbo.Users u2
            WHERE u2.Email = r.Identifier OR u2.Username = r.Identifier
            ORDER BY u2.UserID
        ) u;

        INSERT INTO dbo.Class_Student (ClassID, UserID, JoinDate, ProgressPercent)
        SELECT @ClassID, res.UserID, SYSUTCDATETIME(), 0.0
        FROM @Results res
        WHERE res.Status = 'SUCCESS';

        COMMIT TRANSACTION;

        SELECT 
            RowOrder,
            Identifier,
            UserID,
            Username,
            FullName,
            Email,
            Status
        FROM @Results
        ORDER BY RowOrder ASC;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO
