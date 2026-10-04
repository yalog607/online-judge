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
