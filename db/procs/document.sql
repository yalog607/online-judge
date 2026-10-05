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

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (
            SELECT 1 
            FROM dbo.Classes c
            JOIN dbo.Users u ON u.UserID = @UserID
            WHERE c.ClassID = @ClassID 
              AND (c.TeacherID = @UserID OR u.Role = 'Admin')
        )
        BEGIN
            THROW 50030, 'Nguoi dung khong co quyen tai tai lieu len lop hoc.', 1;
        END;

        INSERT INTO dbo.Documents (ClassID, FileName, CloudinaryURL, Category)
        VALUES (@ClassID, @FileName, @CloudinaryURL, @Category);

        DECLARE @DocumentID INT = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT 
            d.DocumentID,
            d.ClassID,
            d.FileName,
            d.CloudinaryURL,
            d.Category,
            d.UploadDate
        FROM dbo.Documents d
        WHERE d.DocumentID = @DocumentID;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Document_Delete
    @DocumentID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (
            SELECT 1 
            FROM dbo.Documents 
            WHERE DocumentID = @DocumentID
        )
        BEGIN
            THROW 50031, 'Tai lieu khong ton tai.', 1;
        END;

        IF NOT EXISTS (
            SELECT 1 
            FROM dbo.Documents d
            JOIN dbo.Classes c ON d.ClassID = c.ClassID
            JOIN dbo.Users u ON u.UserID = @UserID
            WHERE d.DocumentID = @DocumentID 
              AND (c.TeacherID = @UserID OR u.Role = 'Admin')
        )
        BEGIN
            THROW 50032, 'Nguoi dung khong co quyen xoa tai lieu nay.', 1;
        END;

        DELETE FROM dbo.Documents
        WHERE DocumentID = @DocumentID;

        COMMIT TRANSACTION;

        SELECT @DocumentID AS DocumentID;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Document_List
    @ClassID INT,
    @UserID INT,
    @Category NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
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
        WHERE ClassID = @ClassID
          AND (@Category IS NULL OR Category = @Category)
        ORDER BY UploadDate DESC;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO
