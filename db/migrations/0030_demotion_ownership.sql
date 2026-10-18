-- Chuyển lớp/kỳ thi chưa kết thúc đang thuộc về người không còn là giảng viên sang admin.
DECLARE @AdminID INT = (SELECT TOP (1) UserID FROM dbo.Users WHERE Role = 'Admin' ORDER BY UserID);

IF @AdminID IS NOT NULL
BEGIN
    UPDATE c SET TeacherID = @AdminID
    FROM dbo.Classes c
    JOIN dbo.Users u ON u.UserID = c.TeacherID
    WHERE u.Role NOT IN ('Teacher', 'Admin') AND c.IsCancelled = 0;

    UPDATE co SET CreatorID = @AdminID
    FROM dbo.Contests co
    JOIN dbo.Users u ON u.UserID = co.CreatorID
    WHERE u.Role NOT IN ('Teacher', 'Admin') AND co.EndTime > SYSUTCDATETIME();
END;

-- Người không còn là TA không được giữ quyền hỗ trợ lớp.
DELETE ta
FROM dbo.Class_TA ta
JOIN dbo.Users u ON u.UserID = ta.UserID_TA
WHERE u.Role <> 'TA';
GO
