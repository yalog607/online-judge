DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @Sfx VARCHAR(8) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @AdminID INT, @TeacherID INT, @TAID INT, @ClassID INT, @OtherClassID INT, @ContestID INT, @NewTeacherID INT, @ProblemID INT;

INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('dm_a_' + @Sfx, 'hash', 'dm_a_' + @Sfx + '@test.com', N'DM Admin', 'Admin');
SET @AdminID = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('dm_t_' + @Sfx, 'hash', 'dm_t_' + @Sfx + '@test.com', N'DM Teacher', 'Teacher');
SET @TeacherID = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('dm_nt_' + @Sfx, 'hash', 'dm_nt_' + @Sfx + '@test.com', N'DM New Teacher', 'Teacher');
SET @NewTeacherID = SCOPE_IDENTITY();
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
INSERT dbo.Problems (CreatorID, Title, Statement, InputFormat, OutputFormat, Difficulty) VALUES (@TeacherID, N'DM Problem', N'x', N'x', N'x', 'Easy');
SET @ProblemID = SCOPE_IDENTITY();

-- Giáng giảng viên còn nội dung mà không chọn người nhận: bị chặn, không đổi gì
BEGIN TRY
    EXEC app.usp_Admin_SetUserRole @ActorID = @AdminID, @UserID = @TeacherID, @Role = 'User';
    INSERT @Results VALUES ('Demoting a teacher with content requires a new owner', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Demoting a teacher with content requires a new owner', CASE WHEN ERROR_NUMBER() = 50065 THEN 1 ELSE 0 END);
END CATCH;
INSERT @Results VALUES ('Failed demotion leaves role and ownership unchanged',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @TeacherID AND Role = 'Teacher')
          AND EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND TeacherID = @TeacherID) THEN 1 ELSE 0 END);

-- Người nhận không phải giảng viên: bị chặn
BEGIN TRY
    EXEC app.usp_Admin_SetUserRole @ActorID = @AdminID, @UserID = @TeacherID, @Role = 'User', @NewOwnerID = @TAID;
    INSERT @Results VALUES ('Handover recipient must be an active teacher', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Handover recipient must be an active teacher', CASE WHEN ERROR_NUMBER() = 50061 THEN 1 ELSE 0 END);
END CATCH;

-- Giáng giảng viên xuống User kèm người nhận: lớp, kỳ thi, bài tập đều sang người nhận
EXEC app.usp_Admin_SetUserRole @ActorID = @AdminID, @UserID = @TeacherID, @Role = 'User', @NewOwnerID = @NewTeacherID;
INSERT @Results VALUES ('Demoted teacher class is transferred to the chosen teacher',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND TeacherID = @NewTeacherID) THEN 1 ELSE 0 END);
INSERT @Results VALUES ('Demoted teacher contest is transferred to the chosen teacher',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Contests WHERE ContestID = @ContestID AND CreatorID = @NewTeacherID) THEN 1 ELSE 0 END);
INSERT @Results VALUES ('Demoted teacher problem is transferred to the chosen teacher',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND CreatorID = @NewTeacherID) THEN 1 ELSE 0 END);
INSERT @Results VALUES ('Demoted teacher role is changed',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @TeacherID AND Role = 'User') THEN 1 ELSE 0 END);
INSERT @Results VALUES ('Handover is audited',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.AuditLog WHERE Action = 'TransferOwnership' AND TargetType = 'Problem' AND TargetID = @ProblemID) THEN 1 ELSE 0 END);

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

DELETE FROM dbo.Problems WHERE ProblemID = @ProblemID;
DELETE FROM dbo.Contests WHERE ContestID = @ContestID;
DELETE FROM dbo.Class_TA WHERE ClassID IN (@ClassID, @OtherClassID);
DELETE FROM dbo.Classes WHERE ClassID IN (@ClassID, @OtherClassID);
DELETE FROM dbo.AuditLog WHERE ActorID = @AdminID OR TargetID = @ProblemID AND TargetType = 'Problem';
DELETE FROM dbo.Users WHERE UserID IN (@AdminID, @TeacherID, @NewTeacherID, @TAID, ISNULL(@Admin2, 0));

SELECT Assertion, Passed FROM @Results;
