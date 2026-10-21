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
    u.FullName AS UploaderName,
    u.Email AS UploaderEmail,
    u.Role AS UploaderRole
FROM dbo.Documents d
INNER JOIN dbo.Classes c ON d.ClassID = c.ClassID
INNER JOIN dbo.Users u ON d.UploaderID = u.UserID;
GO
