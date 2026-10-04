CREATE OR ALTER FUNCTION app.ufn_IsStudentInClass
(
    @ClassID INT,
    @UserID INT
)
RETURNS BIT
AS
BEGIN
    DECLARE @Enrolled BIT = 0;
    IF EXISTS (
        SELECT 1 
        FROM dbo.Class_Student 
        WHERE ClassID = @ClassID AND UserID = @UserID
    )
        SET @Enrolled = 1;

    RETURN @Enrolled;
END;
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

CREATE OR ALTER FUNCTION app.ufn_GetClassStudentList
(
    @ClassID INT
)
RETURNS TABLE
AS
RETURN
(
    SELECT 
        cs.ClassID,
        cs.UserID,
        u.Username,
        u.FullName,
        u.Email,
        cs.JoinDate,
        cs.ProgressPercent
    FROM dbo.Class_Student cs
    INNER JOIN dbo.Users u ON cs.UserID = u.UserID
    WHERE cs.ClassID = @ClassID
);
GO
