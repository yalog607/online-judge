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
    ) SET @Allowed = 1;
    ELSE IF EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @ClassID AND UserID = @UserID)
        SET @Allowed = 1;
    ELSE IF EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND IsPublic = 1 AND ApprovalStatus = 'Approved')
        SET @Allowed = 1;
    RETURN @Allowed;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Document_Add
    @ClassID INT,
    @UserID INT,
    @FileName NVARCHAR(255),
    @CloudinaryURL VARCHAR(2048),
    @Category NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Classes c
        JOIN dbo.Users u ON u.UserID = @UserID
        WHERE c.ClassID = @ClassID AND c.IsCancelled = 0
          AND (c.TeacherID = @UserID OR u.Role = 'Admin'
               OR EXISTS (SELECT 1 FROM dbo.Class_TA ta WHERE ta.ClassID = c.ClassID AND ta.UserID_TA = @UserID))
    )
        THROW 50030, 'Nguoi dung khong co quyen tai tai lieu len lop hoc.', 1;

    INSERT dbo.Documents (ClassID, FileName, CloudinaryURL, Category)
    VALUES (@ClassID, @FileName, @CloudinaryURL, @Category);

    DECLARE @DocumentID INT = SCOPE_IDENTITY();
    SELECT DocumentID, ClassID, FileName, CloudinaryURL, Category, UploadDate
    FROM dbo.Documents WHERE DocumentID = @DocumentID;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Document_Delete
    @DocumentID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Documents WHERE DocumentID = @DocumentID)
        THROW 50031, 'Tai lieu khong ton tai.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Documents d
        JOIN dbo.Classes c ON c.ClassID = d.ClassID
        JOIN dbo.Users u ON u.UserID = @UserID
        WHERE d.DocumentID = @DocumentID AND c.IsCancelled = 0
          AND (c.TeacherID = @UserID OR u.Role = 'Admin'
               OR EXISTS (SELECT 1 FROM dbo.Class_TA ta WHERE ta.ClassID = c.ClassID AND ta.UserID_TA = @UserID))
    )
        THROW 50032, 'Nguoi dung khong co quyen xoa tai lieu nay.', 1;

    DELETE dbo.Documents WHERE DocumentID = @DocumentID;
    SELECT @DocumentID AS DocumentID;
END;
GO
