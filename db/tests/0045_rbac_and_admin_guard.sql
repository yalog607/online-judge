DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
BEGIN TRANSACTION;
DECLARE @Sfx VARCHAR(8) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @AdminID INT, @TeacherID INT, @TAID INT, @ClassID INT, @NewID INT;

-- Một Admin phụ (không phải 'admin' gốc) có thể bị xóa khi vẫn còn Admin khác.
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('ag_a_' + @Sfx, 'hash', 'ag_a_' + @Sfx + '@test.com', N'AG Admin', 'Admin');
SET @AdminID = SCOPE_IDENTITY();
DELETE FROM dbo.Users WHERE UserID = @AdminID;
INSERT @Results VALUES ('A secondary admin can be deleted while another admin remains',
    CASE WHEN NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @AdminID) THEN 1 ELSE 0 END);

-- Trigger hủy transaction ngoài, nên các kiểm tra tiếp theo chạy trong transaction mới.
BEGIN TRY
    DELETE FROM dbo.Users WHERE Username = 'admin' AND Role = 'Admin';
    INSERT @Results VALUES ('Root admin cannot be deleted', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Root admin cannot be deleted', CASE WHEN ERROR_NUMBER() = 50049 THEN 1 ELSE 0 END);
END CATCH;
IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

BEGIN TRANSACTION;
SET @Sfx = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('ag_t_' + @Sfx, 'hash', 'ag_t_' + @Sfx + '@test.com', N'AG Teacher', 'Teacher');
SET @TeacherID = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('ag_s_' + @Sfx, 'hash', 'ag_s_' + @Sfx + '@test.com', N'AG TA', 'TA');
SET @TAID = SCOPE_IDENTITY();
INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus) VALUES (@TeacherID, 'AG' + @Sfx, N'AG Class', 1, 'Approved');
SET @ClassID = SCOPE_IDENTITY();
INSERT dbo.Class_TA (ClassID, UserID_TA) VALUES (@ClassID, @TAID);

-- usp_Problem_Create_TA nhận ClassID và ép bài về Pending.
EXEC app.usp_Problem_Create_TA @TA_ID = @TAID, @Title = N'AG draft', @Statement = N'T', @ClassID = @ClassID;
INSERT @Results VALUES ('TA draft problem is created as Pending through usp_Problem_Create_TA',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE CreatorID = @TAID AND Title = N'AG draft' AND Status = 'Pending') THEN 1 ELSE 0 END);

BEGIN TRY
    EXEC app.usp_Problem_Create_TA @TA_ID = @TAID, @Title = N'AG no class', @Statement = N'T';
    INSERT @Results VALUES ('TA draft without a class is rejected', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('TA draft without a class is rejected', CASE WHEN ERROR_NUMBER() = 50012 THEN 1 ELSE 0 END);
END CATCH;
IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

-- Quyền mức cột / bảng có mặt trong CSDL.
INSERT @Results VALUES ('db_student is denied Testcases.InputData',
    CASE WHEN EXISTS (SELECT 1 FROM sys.database_permissions p
                      WHERE p.grantee_principal_id = DATABASE_PRINCIPAL_ID('db_student') AND p.major_id = OBJECT_ID('dbo.Testcases')
                        AND p.state = 'D' AND p.permission_name = 'SELECT' AND COL_NAME(p.major_id, p.minor_id) = 'InputData') THEN 1 ELSE 0 END);
INSERT @Results VALUES ('db_teacher is denied DELETE on Users',
    CASE WHEN EXISTS (SELECT 1 FROM sys.database_permissions p
                      WHERE p.grantee_principal_id = DATABASE_PRINCIPAL_ID('db_teacher') AND p.major_id = OBJECT_ID('dbo.Users')
                        AND p.state = 'D' AND p.permission_name = 'DELETE') THEN 1 ELSE 0 END);
INSERT @Results VALUES ('db_admin has CRUD on schema dbo',
    CASE WHEN EXISTS (SELECT 1 FROM sys.database_permissions p
                      WHERE p.grantee_principal_id = DATABASE_PRINCIPAL_ID('db_admin') AND p.class = 3
                        AND p.state = 'G' AND p.permission_name = 'DELETE') THEN 1 ELSE 0 END);

SELECT Assertion, Passed FROM @Results;
