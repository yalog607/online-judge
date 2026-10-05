DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

DECLARE @TeacherID INT;
DECLARE @ClassID INT;
DECLARE @DocID INT;

SELECT TOP 1 @TeacherID = UserID FROM dbo.Users WHERE Role IN ('Teacher', 'Admin');

IF @TeacherID IS NULL
BEGIN
    INSERT dbo.Users (Username, Password, Email, FullName, Role)
    VALUES ('doc_teacher', 'x', 'doc_teacher@test.com', N'Doc Teacher', 'Teacher');
    SET @TeacherID = SCOPE_IDENTITY();
END;

INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@TeacherID, 'DOCTEST1', N'Doc Test Class', 1, 'Approved');
SET @ClassID = SCOPE_IDENTITY();

BEGIN TRY
    INSERT dbo.Documents (ClassID, FileName, CloudinaryURL)
    VALUES (@ClassID, '   ', 'https://example.com/doc.pdf');
    INSERT @Results VALUES ('CK_Documents_FileName blocks empty filename', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('CK_Documents_FileName blocks empty filename', 1);
END CATCH;

BEGIN TRY
    INSERT dbo.Documents (ClassID, FileName, CloudinaryURL)
    VALUES (@ClassID, 'Valid.pdf', '   ');
    INSERT @Results VALUES ('CK_Documents_URL blocks empty url', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('CK_Documents_URL blocks empty url', 1);
END CATCH;

BEGIN TRY
    EXEC app.usp_Document_Add
        @ClassID = @ClassID,
        @UserID = @TeacherID,
        @FileName = N'Lecture1.pdf',
        @CloudinaryURL = 'https://res.cloudinary.com/test/raw/upload/v1/lecture1.pdf',
        @Category = N'Lecture';
    INSERT @Results VALUES ('app.usp_Document_Add executes successfully', 1);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('app.usp_Document_Add executes successfully', 0);
END CATCH;

SELECT TOP 1 @DocID = DocumentID 
FROM dbo.Documents 
WHERE ClassID = @ClassID AND FileName = N'Lecture1.pdf';

IF EXISTS (
    SELECT 1 
    FROM dbo.AuditLog 
    WHERE TargetType = 'Document' AND TargetID = @DocID AND Action = 'DOCUMENT_UPLOAD'
)
BEGIN
    INSERT @Results VALUES ('trg_Documents_AuditLog logs insert', 1);
END
ELSE
BEGIN
    INSERT @Results VALUES ('trg_Documents_AuditLog logs insert', 0);
END;

IF app.ufn_CanAccessClassDocuments(@ClassID, @TeacherID) = 1
BEGIN
    INSERT @Results VALUES ('ufn_CanAccessClassDocuments returns true for teacher', 1);
END
ELSE
BEGIN
    INSERT @Results VALUES ('ufn_CanAccessClassDocuments returns true for teacher', 0);
END;

BEGIN TRY
    EXEC app.usp_Document_Delete
        @DocumentID = @DocID,
        @UserID = @TeacherID;
    INSERT @Results VALUES ('app.usp_Document_Delete executes successfully', 1);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('app.usp_Document_Delete executes successfully', 0);
END CATCH;

IF EXISTS (
    SELECT 1 
    FROM dbo.AuditLog 
    WHERE TargetType = 'Document' AND TargetID = @DocID AND Action = 'DOCUMENT_DELETE'
)
BEGIN
    INSERT @Results VALUES ('trg_Documents_AuditLog logs delete', 1);
END
ELSE
BEGIN
    INSERT @Results VALUES ('trg_Documents_AuditLog logs delete', 0);
END;

DELETE FROM dbo.Classes WHERE ClassID = @ClassID;

SELECT Assertion, Passed FROM @Results;
