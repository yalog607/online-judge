DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @Sfx VARCHAR(8) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @TeacherID INT, @TAID INT, @ClassID INT, @PendingClassID INT;
DECLARE @Ignore TABLE (X INT);

INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('kk_t_' + @Sfx, 'hash', 'kk_t_' + @Sfx + '@test.com', N'KK Teacher', 'Teacher');
SET @TeacherID = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('kk_ta_' + @Sfx, 'hash', 'kk_ta_' + @Sfx + '@test.com', N'KK TA', 'TA');
SET @TAID = SCOPE_IDENTITY();

INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@TeacherID, 'KK' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 10), N'KK Class', 1, 'Approved');
SET @ClassID = SCOPE_IDENTITY();
INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@TeacherID, 'KK' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 10), N'KK Pending', 1, 'Pending');
SET @PendingClassID = SCOPE_IDENTITY();

INSERT dbo.Class_Student (ClassID, UserID, JoinDate, ProgressPercent) VALUES (@ClassID, @TAID, SYSUTCDATETIME(), 0);
INSERT dbo.Class_TA (ClassID, UserID_TA) VALUES (@ClassID, @TAID);

-- Kick TA khỏi lớp: mất quyền TA của lớp đó và về vai trò User khi hết lớp
INSERT @Ignore EXEC app.usp_Class_RemoveStudent @ClassID = @ClassID, @TeacherID = @TeacherID, @StudentID = @TAID;
INSERT @Results VALUES ('Kicked TA loses Class_TA row',
    CASE WHEN NOT EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = @ClassID AND UserID_TA = @TAID) THEN 1 ELSE 0 END);
INSERT @Results VALUES ('Kicked TA with no class left becomes User',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @TAID AND Role = 'User') THEN 1 ELSE 0 END);

-- Lớp chưa duyệt không cho tương tác
BEGIN TRY
    EXEC app.usp_Class_AddStudent @ClassID = @PendingClassID, @TeacherID = @TeacherID, @Identifier = 'nobody';
    INSERT @Results VALUES ('Cannot add student to pending class', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Cannot add student to pending class', CASE WHEN ERROR_NUMBER() = 50027 THEN 1 ELSE 0 END);
END CATCH;

BEGIN TRY
    EXEC app.usp_Contest_Create @CreatorID = @TeacherID, @ContestName = N'KK Contest',
        @StartTime = '2099-01-01', @EndTime = '2099-01-02', @ClassID = @PendingClassID;
    INSERT @Results VALUES ('Cannot create contest for pending class', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Cannot create contest for pending class', CASE WHEN ERROR_NUMBER() = 50032 THEN 1 ELSE 0 END);
END CATCH;

BEGIN TRY
    EXEC app.usp_Class_RequestUpgradeToTA @ClassID = @PendingClassID, @UserID = @TAID, @TeacherID = @TeacherID;
    INSERT @Results VALUES ('Cannot request TA for pending class', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Cannot request TA for pending class', CASE WHEN ERROR_NUMBER() = 50027 THEN 1 ELSE 0 END);
END CATCH;

DELETE FROM dbo.Class_Student WHERE ClassID IN (@ClassID, @PendingClassID);
DELETE FROM dbo.Classes WHERE ClassID IN (@ClassID, @PendingClassID);
DELETE FROM dbo.Users WHERE UserID IN (@TeacherID, @TAID);

SELECT Assertion, Passed FROM @Results;
