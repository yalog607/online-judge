DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @Sfx VARCHAR(8) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @AdminID INT, @T1 INT, @T2 INT, @UserID INT, @ClassID INT, @ContestID INT, @ProblemID INT;

INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('tr_a_' + @Sfx, 'hash', 'tr_a_' + @Sfx + '@test.com', N'TR Admin', 'Admin');
SET @AdminID = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('tr_t1_' + @Sfx, 'hash', 'tr_t1_' + @Sfx + '@test.com', N'TR Teacher1', 'Teacher');
SET @T1 = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('tr_t2_' + @Sfx, 'hash', 'tr_t2_' + @Sfx + '@test.com', N'TR Teacher2', 'Teacher');
SET @T2 = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('tr_u_' + @Sfx, 'hash', 'tr_u_' + @Sfx + '@test.com', N'TR User', 'User');
SET @UserID = SCOPE_IDENTITY();

INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@AdminID, 'TR' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 10), N'TR Class', 1, 'Approved');
SET @ClassID = SCOPE_IDENTITY();
INSERT dbo.Contests (CreatorID, ContestName, StartTime, EndTime)
VALUES (@AdminID, N'TR Contest', DATEADD(HOUR, -1, SYSUTCDATETIME()), DATEADD(DAY, 1, SYSUTCDATETIME()));
SET @ContestID = SCOPE_IDENTITY();
DECLARE @NewProblem TABLE (ProblemID INT);
INSERT @NewProblem EXEC app.usp_Problem_Create
    @CreatorID = @AdminID, @Title = N'TR Problem', @Statement = N'S', @InputFormat = N'N', @OutputFormat = N'N',
    @TimeLimit = 1000, @MemoryLimit = 256, @Tags = N'x', @Difficulty = 'Easy', @Status = 'Public';
SELECT @ProblemID = ProblemID FROM @NewProblem;

-- Liệt kê tài sản của admin
DECLARE @Owned TABLE (ItemType VARCHAR(20), ItemID INT, Name NVARCHAR(300));
INSERT @Owned EXEC app.usp_Admin_ListOwnedItems @ActorID = @AdminID, @UserID = @AdminID;
INSERT @Results VALUES ('ListOwnedItems returns class, contest and problem',
    CASE WHEN EXISTS (SELECT 1 FROM @Owned WHERE ItemType = 'Class' AND ItemID = @ClassID)
          AND EXISTS (SELECT 1 FROM @Owned WHERE ItemType = 'Contest' AND ItemID = @ContestID)
          AND EXISTS (SELECT 1 FROM @Owned WHERE ItemType = 'Problem' AND ItemID = @ProblemID) THEN 1 ELSE 0 END);

-- Chuyển cả ba loại sang giảng viên 1
EXEC app.usp_Admin_TransferOwnership @ActorID = @AdminID, @ItemType = 'Class', @ItemID = @ClassID, @NewOwnerID = @T1;
EXEC app.usp_Admin_TransferOwnership @ActorID = @AdminID, @ItemType = 'Contest', @ItemID = @ContestID, @NewOwnerID = @T1;
EXEC app.usp_Admin_TransferOwnership @ActorID = @AdminID, @ItemType = 'Problem', @ItemID = @ProblemID, @NewOwnerID = @T1;
INSERT @Results VALUES ('Class, contest and problem are transferred to the new teacher',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND TeacherID = @T1)
          AND EXISTS (SELECT 1 FROM dbo.Contests WHERE ContestID = @ContestID AND CreatorID = @T1)
          AND EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND CreatorID = @T1) THEN 1 ELSE 0 END);
INSERT @Results VALUES ('Transfers are written to AuditLog',
    CASE WHEN (SELECT COUNT(*) FROM dbo.AuditLog WHERE ActorID = @AdminID AND Action = 'TransferOwnership') = 3 THEN 1 ELSE 0 END);

-- Bàn giao tiếp cho giảng viên 2 (giảng viên 1 từng được giáng chức rồi thăng lại)
EXEC app.usp_Admin_TransferOwnership @ActorID = @AdminID, @ItemType = 'Class', @ItemID = @ClassID, @NewOwnerID = @T2;
INSERT @Results VALUES ('Class can be handed over again to another teacher',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND TeacherID = @T2) THEN 1 ELSE 0 END);

-- Người nhận không phải giảng viên bị từ chối
BEGIN TRY
    EXEC app.usp_Admin_TransferOwnership @ActorID = @AdminID, @ItemType = 'Class', @ItemID = @ClassID, @NewOwnerID = @UserID;
    INSERT @Results VALUES ('Transfer to a non-teacher is rejected', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Transfer to a non-teacher is rejected', CASE WHEN ERROR_NUMBER() = 50061 THEN 1 ELSE 0 END);
END CATCH;

-- Người không phải admin bị từ chối
BEGIN TRY
    EXEC app.usp_Admin_TransferOwnership @ActorID = @T1, @ItemType = 'Class', @ItemID = @ClassID, @NewOwnerID = @T1;
    INSERT @Results VALUES ('Non-admin cannot transfer ownership', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Non-admin cannot transfer ownership', CASE WHEN ERROR_NUMBER() = 50030 THEN 1 ELSE 0 END);
END CATCH;

-- Chuyển cho chính chủ hiện tại bị từ chối
BEGIN TRY
    EXEC app.usp_Admin_TransferOwnership @ActorID = @AdminID, @ItemType = 'Class', @ItemID = @ClassID, @NewOwnerID = @T2;
    INSERT @Results VALUES ('Transfer to current owner is rejected', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Transfer to current owner is rejected', CASE WHEN ERROR_NUMBER() = 50063 THEN 1 ELSE 0 END);
END CATCH;

DELETE FROM dbo.Contests WHERE ContestID = @ContestID;
DELETE FROM dbo.Testcases WHERE ProblemID = @ProblemID;
DELETE FROM dbo.Problems WHERE ProblemID = @ProblemID;
DELETE FROM dbo.Classes WHERE ClassID = @ClassID;
DELETE FROM dbo.AuditLog WHERE ActorID = @AdminID;
DELETE FROM dbo.Users WHERE UserID IN (@AdminID, @T1, @T2, @UserID);

SELECT Assertion, Passed FROM @Results;
