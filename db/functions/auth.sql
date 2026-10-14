CREATE OR ALTER FUNCTION app.ufn_CanImpersonateUser
(
    @ActorID INT,
    @TargetUserID INT
)
RETURNS BIT
AS
BEGIN
    IF @ActorID IS NULL OR @TargetUserID IS NULL OR @ActorID = @TargetUserID
        RETURN 0;

    DECLARE @ActorRole VARCHAR(20);
    DECLARE @ActorStatus VARCHAR(20);
    DECLARE @TargetRole VARCHAR(20);
    DECLARE @TargetStatus VARCHAR(20);

    SELECT @ActorRole = Role, @ActorStatus = Status FROM dbo.Users WHERE UserID = @ActorID;
    SELECT @TargetRole = Role, @TargetStatus = Status FROM dbo.Users WHERE UserID = @TargetUserID;

    IF @ActorStatus <> 'Active' OR @TargetStatus <> 'Active'
        RETURN 0;

    IF @ActorRole = 'Admin' AND @TargetRole <> 'Admin'
        RETURN 1;

    IF @ActorRole = 'Teacher' AND @TargetRole IN ('User', 'TA')
    BEGIN
        IF EXISTS (
            SELECT 1 
            FROM dbo.Class_Student cs
            INNER JOIN dbo.Classes c ON c.ClassID = cs.ClassID
            WHERE c.TeacherID = @ActorID 
              AND cs.UserID = @TargetUserID
        )
            RETURN 1;
    END

    RETURN 0;
END;
GO

CREATE OR ALTER FUNCTION app.ufn_GetImpersonatableStudentsForTeacher
(
    @TeacherID INT,
    @ClassID INT = NULL
)
RETURNS TABLE
AS
RETURN
(
    SELECT DISTINCT
        u.UserID,
        u.Username,
        u.FullName,
        u.Email,
        u.Role,
        u.Avatar,
        c.ClassID,
        c.ClassName
    FROM dbo.Classes c
    INNER JOIN dbo.Class_Student cs ON cs.ClassID = c.ClassID
    INNER JOIN dbo.Users u ON u.UserID = cs.UserID
    WHERE c.TeacherID = @TeacherID
      AND (@ClassID IS NULL OR c.ClassID = @ClassID)
      AND u.Status = 'Active'
      AND u.Role IN ('User', 'TA')
);
GO
