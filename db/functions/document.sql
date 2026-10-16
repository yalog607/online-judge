CREATE OR ALTER FUNCTION app.ufn_CanAccessClassDocuments
(
    @ClassID INT,
    @UserID INT
)
RETURNS BIT
AS
BEGIN
    DECLARE @Allowed BIT = 0;

    IF EXISTS (
        SELECT 1 
        FROM dbo.Classes c
        JOIN dbo.Users u ON u.UserID = @UserID
        WHERE c.ClassID = @ClassID 
          AND (c.TeacherID = @UserID OR u.Role = 'Admin'
               OR EXISTS (SELECT 1 FROM dbo.Class_TA ta WHERE ta.ClassID = c.ClassID AND ta.UserID_TA = @UserID))
    )
    BEGIN
        SET @Allowed = 1;
    END
    ELSE IF EXISTS (
        SELECT 1 
        FROM dbo.Class_Student 
        WHERE ClassID = @ClassID AND UserID = @UserID
    )
    BEGIN
        SET @Allowed = 1;
    END
    ELSE IF EXISTS (
        SELECT 1 
        FROM dbo.Classes 
        WHERE ClassID = @ClassID AND IsPublic = 1 AND ApprovalStatus = 'Approved'
    )
    BEGIN
        SET @Allowed = 1;
    END;

    RETURN @Allowed;
END;
GO

