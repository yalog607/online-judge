DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @Sfx VARCHAR(8) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @TeacherID INT, @OtherTeacherID INT, @TAID INT, @ClassID INT, @Code VARCHAR(20) = 'DUP' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @Ignore TABLE (X INT, Y VARCHAR(20));

INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('dt_t_' + @Sfx, 'hash', 'dt_t_' + @Sfx + '@test.com', N'DT Teacher', 'Teacher');
SET @TeacherID = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('dt_o_' + @Sfx, 'hash', 'dt_o_' + @Sfx + '@test.com', N'DT Other', 'Teacher');
SET @OtherTeacherID = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('dt_ta_' + @Sfx, 'hash', 'dt_ta_' + @Sfx + '@test.com', N'DT TA', 'TA');
SET @TAID = SCOPE_IDENTITY();

INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@TeacherID, @Code, N'DT Class', 1, 'Approved');
SET @ClassID = SCOPE_IDENTITY();
INSERT dbo.Class_Student (ClassID, UserID, JoinDate, ProgressPercent) VALUES (@ClassID, @TAID, SYSUTCDATETIME(), 0);
INSERT dbo.Class_TA (ClassID, UserID_TA) VALUES (@ClassID, @TAID);

-- Mã mời trùng khi tạo lớp
BEGIN TRY
    INSERT @Ignore EXEC app.usp_Class_Create @TeacherID = @OtherTeacherID, @ClassName = N'DT Dup', @InviteCode = @Code;
    INSERT @Results VALUES ('Duplicate invite code is rejected', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Duplicate invite code is rejected', CASE WHEN ERROR_NUMBER() = 50044 THEN 1 ELSE 0 END);
END CATCH;

-- Giáng chức TA: người lạ không được, giảng viên của lớp được
BEGIN TRY
    EXEC app.usp_Class_RemoveTA @ClassID = @ClassID, @ActorID = @OtherTeacherID, @UserID = @TAID;
    INSERT @Results VALUES ('Other teacher cannot demote a TA', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Other teacher cannot demote a TA', CASE WHEN ERROR_NUMBER() = 50027 THEN 1 ELSE 0 END);
END CATCH;

EXEC app.usp_Class_RemoveTA @ClassID = @ClassID, @ActorID = @TeacherID, @UserID = @TAID;
INSERT @Results VALUES ('Class teacher demotes TA: Class_TA row removed',
    CASE WHEN NOT EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = @ClassID AND UserID_TA = @TAID) THEN 1 ELSE 0 END);
INSERT @Results VALUES ('Demoted TA stays in the class and returns to User role',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @ClassID AND UserID = @TAID)
          AND EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @TAID AND Role = 'User') THEN 1 ELSE 0 END);

-- Hủy rồi mở lại lớp
EXEC app.usp_Class_Cancel @ClassID = @ClassID, @TeacherID = @TeacherID;
BEGIN TRY
    EXEC app.usp_Class_Reopen @ClassID = @ClassID, @TeacherID = @OtherTeacherID;
    INSERT @Results VALUES ('Only the owner can reopen a class', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Only the owner can reopen a class', CASE WHEN ERROR_NUMBER() = 50042 THEN 1 ELSE 0 END);
END CATCH;
EXEC app.usp_Class_Reopen @ClassID = @ClassID, @TeacherID = @TeacherID;
INSERT @Results VALUES ('Owner reopens a cancelled class',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND IsCancelled = 0) THEN 1 ELSE 0 END);

DELETE FROM dbo.Class_Student WHERE ClassID = @ClassID;
DELETE FROM dbo.Classes WHERE ClassID = @ClassID;
DELETE FROM dbo.AuditLog WHERE ActorID IN (@TeacherID, @OtherTeacherID);
DELETE FROM dbo.Users WHERE UserID IN (@TeacherID, @OtherTeacherID, @TAID);

SELECT Assertion, Passed FROM @Results;
