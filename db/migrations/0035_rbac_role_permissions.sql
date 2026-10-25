-- Hoàn thiện phân quyền mức CSDL cho 4 role nghiệp vụ (db_student, db_teacher, db_ta, db_admin).
-- Ứng dụng web chỉ dùng role app_executor (EXECUTE schema app), nên migration này không đổi hành vi của web;
-- nó cho phép đăng nhập thẳng bằng user thuộc các role này (báo cáo, kiểm toán) mà vẫn đúng đặc quyền tối thiểu.
-- Chạy lại nhiều lần an toàn: GRANT/DENY/REVOKE đều idempotent.

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db_student' AND type = 'R') CREATE ROLE db_student AUTHORIZATION dbo;
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db_teacher' AND type = 'R') CREATE ROLE db_teacher AUTHORIZATION dbo;
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db_ta'      AND type = 'R') CREATE ROLE db_ta      AUTHORIZATION dbo;
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db_admin'   AND type = 'R') CREATE ROLE db_admin   AUTHORIZATION dbo;
GO

-- ===== db_student: học viên =====
-- Đề bài chỉ xem qua view an toàn (Status = 'Public'), không đọc bảng gốc.
REVOKE SELECT ON dbo.Problems FROM db_student;
GRANT  SELECT ON app.uvw_PublicProblems_Security TO db_student;
-- Bài nộp: nộp và xem, không sửa/xóa (lịch sử chấm bất biến).
GRANT  SELECT, INSERT ON dbo.Submissions TO db_student;
DENY   UPDATE, DELETE ON dbo.Submissions TO db_student;
GRANT  SELECT ON dbo.SubmissionResults TO db_student;
-- Testcase: chỉ thấy siêu dữ liệu, không thấy nội dung.
GRANT  SELECT ON dbo.Testcases (TestCaseID, ProblemID, OrderIndex, IsHidden) TO db_student;
DENY   SELECT ON dbo.Testcases (InputData, ExpectedOutput) TO db_student;
-- Lớp học, tài liệu, kỳ thi, bình luận.
GRANT  SELECT ON dbo.Classes TO db_student;
GRANT  SELECT ON dbo.Class_Student TO db_student;
GRANT  INSERT ON dbo.Class_JoinRequests TO db_student;
GRANT  SELECT ON dbo.Documents TO db_student;
DENY   INSERT, UPDATE, DELETE ON dbo.Documents TO db_student;
GRANT  SELECT ON dbo.Contests TO db_student;
GRANT  SELECT, INSERT ON dbo.Comments TO db_student;
-- Tài khoản: không thấy email người khác, không thấy mật khẩu băm.
GRANT  SELECT ON dbo.Users (UserID, Username, FullName, Role, Status) TO db_student;
DENY   SELECT ON dbo.Users (Password) TO db_student;
-- Hạ tầng và kiểm toán.
DENY   SELECT, INSERT, UPDATE, DELETE ON dbo.AuditLog TO db_student;
DENY   SELECT, INSERT, UPDATE, DELETE ON dbo.JudgeWorkers TO db_student;
GO

-- ===== db_teacher: giảng viên =====
GRANT  SELECT, INSERT, UPDATE ON dbo.Problems TO db_teacher;
GRANT  SELECT, INSERT, UPDATE, DELETE ON dbo.Testcases TO db_teacher;
GRANT  SELECT, INSERT, UPDATE, DELETE ON dbo.TestcaseGroups TO db_teacher;
GRANT  SELECT, INSERT, UPDATE ON dbo.Classes TO db_teacher;
GRANT  SELECT, INSERT, DELETE ON dbo.Class_Student TO db_teacher;
GRANT  SELECT, INSERT, DELETE ON dbo.Class_TA TO db_teacher;
GRANT  SELECT, UPDATE ON dbo.Class_JoinRequests TO db_teacher;
GRANT  SELECT, INSERT, UPDATE, DELETE ON dbo.Documents TO db_teacher;
GRANT  SELECT, INSERT, UPDATE ON dbo.Contests TO db_teacher;
GRANT  SELECT, INSERT, UPDATE, DELETE ON dbo.Contest_Problem TO db_teacher;
GRANT  SELECT ON dbo.Contest_User TO db_teacher;
GRANT  SELECT ON dbo.Submissions TO db_teacher;
GRANT  SELECT ON dbo.SubmissionResults TO db_teacher;
GRANT  SELECT, INSERT, UPDATE, DELETE ON dbo.Comments TO db_teacher;
GRANT  SELECT ON dbo.Users (UserID, Username, FullName, Email, Role, Status) TO db_teacher;
DENY   SELECT ON dbo.Users (Password) TO db_teacher;
DENY   DELETE ON dbo.Users    TO db_teacher;      -- chỉ Admin được xóa tài khoản
DENY   DELETE ON dbo.AuditLog TO db_teacher;      -- nhật ký bất biến
DENY   SELECT, INSERT, UPDATE, DELETE ON dbo.JudgeWorkers TO db_teacher;
GO

-- ===== db_ta: trợ giảng – phần còn thiếu so với 0034 =====
GRANT  SELECT ON dbo.Class_Student TO db_ta;
GRANT  SELECT ON dbo.Class_TA TO db_ta;
GRANT  SELECT ON dbo.Submissions TO db_ta;
GRANT  SELECT ON dbo.SubmissionResults TO db_ta;
GRANT  SELECT, INSERT, UPDATE, DELETE ON dbo.Comments TO db_ta;
DENY   DELETE ON dbo.Problems TO db_ta;
DENY   DELETE ON dbo.Users    TO db_ta;
DENY   SELECT, INSERT, UPDATE, DELETE ON dbo.AuditLog TO db_ta;
DENY   SELECT, INSERT, UPDATE, DELETE ON dbo.JudgeWorkers TO db_ta;
GO

-- ===== db_admin: quản trị =====
GRANT  SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO db_admin;
GRANT  EXECUTE ON SCHEMA::app TO db_admin;
DENY   DELETE ON dbo.AuditLog TO db_admin;        -- ngay cả Admin cũng không xóa được nhật ký
DENY   SELECT ON dbo.Users (Password) TO db_admin; -- mật khẩu băm chỉ được xử lý trong thủ tục
GO
