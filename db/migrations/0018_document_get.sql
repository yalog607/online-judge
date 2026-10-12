CREATE OR ALTER PROCEDURE app.usp_Document_Get
    @DocumentID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ClassID INT;
    SELECT @ClassID = ClassID FROM dbo.Documents WHERE DocumentID = @DocumentID;

    IF @ClassID IS NULL
    BEGIN
        THROW 50031, 'Tai lieu khong ton tai.', 1;
    END;

    IF app.ufn_CanAccessClassDocuments(@ClassID, @UserID) = 0
    BEGIN
        THROW 50033, 'Nguoi dung khong co quyen xem tai lieu cua lop hoc.', 1;
    END;

    SELECT 
        DocumentID,
        ClassID,
        FileName,
        CloudinaryURL,
        Category,
        UploadDate
    FROM dbo.Documents
    WHERE DocumentID = @DocumentID;
END;
GO
