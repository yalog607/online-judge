DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @Sfx VARCHAR(8) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @AdminID INT, @TeacherID INT, @TAID INT, @ClassID INT, @OtherClassID INT, @ContestID INT;

INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('dm_a_' + @Sfx, 'hash', 'dm_a_' + @Sfx + '@test.com', N'DM Admin', 'Admin');
SET @AdminID = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('dm_t_' + @Sfx, 'hash', 'dm_t_' + @Sfx + '@test.com', N'DM Teacher', 'Teacher');
SET @TeacherID = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('dm_ta_' + @Sfx, 'hash', 'dm_ta_' + @Sfx + '@test.com', N'DM TA', 'TA');
SET @TAID = SCOPE_IDENTITY();

INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@TeacherID, 'DM' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 10), N'DM Class', 1, 'Approved');
SET @ClassID = SCOPE_IDENTITY();
INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@AdminID, 'DM' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 10), N'DM Other Class', 1, 'Approved');
SET @OtherClassID = SCOPE_IDENTITY();
INSERT dbo.Class_TA (ClassID, UserID_TA) VALUES (@OtherClassID, @TAID);

INSERT dbo.Contests (CreatorID, ContestName, StartTime, EndTime)
VALUES (@TeacherID, N'DM Contest', DATEADD(HOUR, -1, SYSUTCDATETIME()), DATEADD(DAY, 1, SYSUTCDATETIME()));
SET @ContestID = SCOPE_IDENTITY();

-- Giáng giảng viên xuống User: lớp và kỳ thi chưa kết thúc sang admin thực hiện
EXEC app.usp_Admin_SetUserRole @ActorID = @AdminID, @UserID = @TeacherID, @Role = 'User';
INSERT @Results VALUES ('Demoted teacher class is transferred to the acting admin',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND TeacherID = @AdminID) THEN 1 ELSE 0 END);
INSERT @Results VALUES ('Demoted teacher active contest is transferred to the acting admin',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Contests WHERE ContestID = @ContestID AND CreatorID = @AdminID) THEN 1 ELSE 0 END);

-- Người đã bị giáng chức không thêm được học sinh nữa
BEGIN TRY
    EXEC app.usp_Class_AddStudent @ClassID = @ClassID, @TeacherID = @TeacherID, @Identifier = 'nobody';
    INSERT @Results VALUES ('Ex-teacher cannot add students', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Ex-teacher cannot add students', CASE WHEN ERROR_NUMBER() = 50027 THEN 1 ELSE 0 END);
END CATCH;

-- Rời vai TA: gỡ khỏi Class_TA
EXEC app.usp_Admin_SetUserRole @ActorID = @AdminID, @UserID = @TAID, @Role = 'User';
INSERT @Results VALUES ('Demoted TA is removed from Class_TA',
    CASE WHEN NOT EXISTS (SELECT 1 FROM dbo.Class_TA WHERE UserID_TA = @TAID) THEN 1 ELSE 0 END);

-- Không thể khóa tài khoản Admin
BEGIN TRY
    DECLARE @Admin2 INT;
    INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('dm_a2_' + @Sfx, 'hash', 'dm_a2_' + @Sfx + '@test.com', N'DM Admin2', 'Admin');
    SET @Admin2 = SCOPE_IDENTITY();
    EXEC app.usp_Admin_SetUserStatus @ActorID = @AdminID, @UserID = @Admin2, @Status = 'Locked';
    INSERT @Results VALUES ('Admin cannot lock another admin', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Admin cannot lock another admin', 1);
END CATCH;

DELETE FROM dbo.Contests WHERE ContestID = @ContestID;
DELETE FROM dbo.Class_TA WHERE ClassID IN (@ClassID, @OtherClassID);
DELETE FROM dbo.Classes WHERE ClassID IN (@ClassID, @OtherClassID);
DELETE FROM dbo.AuditLog WHERE ActorID = @AdminID;
DELETE FROM dbo.Users WHERE UserID IN (@AdminID, @TeacherID, @TAID, ISNULL(@Admin2, 0));

SELECT Assertion, Passed FROM @Results;
