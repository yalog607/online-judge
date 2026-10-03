CREATE OR ALTER VIEW app.uvw_ClassOverview
AS
SELECT 
    c.ClassID,
    c.TeacherID,
    u.FullName AS TeacherName,
    u.Email AS TeacherEmail,
    c.InviteCode,
    c.ClassName,
    c.Description,
    c.IsPublic,
    c.ApprovalStatus,
    c.CreatedAt,
    COUNT(cs.UserID) AS StudentCount
FROM dbo.Classes c
INNER JOIN dbo.Users u ON c.TeacherID = u.UserID
LEFT JOIN dbo.Class_Student cs ON c.ClassID = cs.ClassID
GROUP BY 
    c.ClassID,
    c.TeacherID,
    u.FullName,
    u.Email,
    c.InviteCode,
    c.ClassName,
    c.Description,
    c.IsPublic,
    c.ApprovalStatus,
    c.CreatedAt;
GO
