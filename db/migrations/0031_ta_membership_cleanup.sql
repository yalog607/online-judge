-- Dọn dữ liệu TA lệch: TA đã bị xóa khỏi lớp (không còn là học viên) vẫn giữ quyền ở lớp đó,
-- và người mang vai trò TA nhưng không còn là TA của lớp nào.
DELETE ta
FROM dbo.Class_TA ta
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Class_Student cs
    WHERE cs.ClassID = ta.ClassID AND cs.UserID = ta.UserID_TA
);

UPDATE u SET Role = 'User'
FROM dbo.Users u
WHERE u.Role = 'TA'
  AND NOT EXISTS (SELECT 1 FROM dbo.Class_TA ta WHERE ta.UserID_TA = u.UserID);
