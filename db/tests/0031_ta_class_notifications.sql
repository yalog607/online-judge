DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

DECLARE @Sfx VARCHAR(8) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @TeacherID INT, @StudentID INT, @AdminID INT, @ClassID INT, @RequestID INT;
INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES ('tan_t_' + @Sfx, 'hash', 'tan_t_' + @Sfx + '@test.com', N'TAN Teacher', 'Teacher');
SET @TeacherID = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES ('tan_s_' + @Sfx, 'hash', 'tan_s_' + @Sfx + '@test.com', N'TAN Student', 'User');
SET @StudentID = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES ('tan_a_' + @Sfx, 'hash', 'tan_a_' + @Sfx + '@test.com', N'TAN Admin', 'Admin');
SET @AdminID = SCOPE_IDENTITY();

INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@TeacherID, 'TN' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 10), N'TAN Class', 1, 'Approved');
SET @ClassID = SCOPE_IDENTITY();
INSERT dbo.Class_Student (ClassID, UserID) VALUES (@ClassID, @StudentID);

-- usp_Notification_AdminIds
DECLARE @Admins TABLE (UserID INT);
INSERT @Admins EXEC app.usp_Notification_AdminIds;
INSERT @Results VALUES ('AdminIds lists admins and not teachers',
    CASE WHEN EXISTS (SELECT 1 FROM @Admins WHERE UserID = @AdminID)
          AND NOT EXISTS (SELECT 1 FROM @Admins WHERE UserID = @TeacherID) THEN 1 ELSE 0 END);

-- usp_Notification_ClassCreatedInfo
DECLARE @CI TABLE (ClassName NVARCHAR(150), TeacherID INT, TeacherName NVARCHAR(100));
INSERT @CI EXEC app.usp_Notification_ClassCreatedInfo @ClassID = @ClassID;
INSERT @Results VALUES ('ClassCreatedInfo returns class name and teacher',
    CASE WHEN EXISTS (SELECT 1 FROM @CI WHERE ClassName = N'TAN Class' AND TeacherID = @TeacherID AND TeacherName = N'TAN Teacher')
         THEN 1 ELSE 0 END);

-- usp_Class_RequestUpgradeToTA reports whether a request was created
DECLARE @Req1 TABLE (Created BIT);
DECLARE @Req2 TABLE (Created BIT);
INSERT @Req1 EXEC app.usp_Class_RequestUpgradeToTA @ClassID = @ClassID, @UserID = @StudentID, @TeacherID = @TeacherID;
INSERT @Results VALUES ('First TA request reports Created = 1',
    CASE WHEN (SELECT Created FROM @Req1) = 1 THEN 1 ELSE 0 END);
INSERT @Req2 EXEC app.usp_Class_RequestUpgradeToTA @ClassID = @ClassID, @UserID = @StudentID, @TeacherID = @TeacherID;
INSERT @Results VALUES ('Duplicate pending TA request reports Created = 0',
    CASE WHEN (SELECT Created FROM @Req2) = 0 THEN 1 ELSE 0 END);

SELECT @RequestID = RequestID FROM dbo.TA_Requests WHERE ClassID = @ClassID AND UserID = @StudentID;

-- usp_Notification_TARequestInfo / ById
DECLARE @RI TABLE (RequestID INT, ClassID INT, ClassName NVARCHAR(150), UserID INT, StudentName NVARCHAR(100),
                   RequestedBy INT, TeacherName NVARCHAR(100), Status VARCHAR(20));
INSERT @RI EXEC app.usp_Notification_TARequestInfo @ClassID = @ClassID, @UserID = @StudentID;
INSERT @Results VALUES ('TARequestInfo returns the pending request with names',
    CASE WHEN EXISTS (SELECT 1 FROM @RI WHERE RequestID = @RequestID AND StudentName = N'TAN Student'
                      AND TeacherName = N'TAN Teacher' AND RequestedBy = @TeacherID AND Status = 'Pending')
         THEN 1 ELSE 0 END);

-- usp_Admin_ApproveTA reports whether it decided a pending request
DECLARE @Ap1 TABLE (Changed BIT);
DECLARE @Ap2 TABLE (Changed BIT);
INSERT @Ap1 EXEC app.usp_Admin_ApproveTA @RequestID = @RequestID, @AdminID = @AdminID, @IsApproved = 1;
INSERT @Results VALUES ('Approving a pending request reports Changed = 1',
    CASE WHEN (SELECT Changed FROM @Ap1) = 1 THEN 1 ELSE 0 END);
INSERT @Ap2 EXEC app.usp_Admin_ApproveTA @RequestID = @RequestID, @AdminID = @AdminID, @IsApproved = 1;
INSERT @Results VALUES ('Approving again reports Changed = 0',
    CASE WHEN (SELECT Changed FROM @Ap2) = 0 THEN 1 ELSE 0 END);

DECLARE @RB TABLE (RequestID INT, ClassID INT, ClassName NVARCHAR(150), UserID INT, StudentName NVARCHAR(100),
                   RequestedBy INT, TeacherName NVARCHAR(100), Status VARCHAR(20), RejectionReason NVARCHAR(MAX));
INSERT @RB EXEC app.usp_Notification_TARequestById @RequestID = @RequestID;
INSERT @Results VALUES ('TARequestById shows the request as Approved',
    CASE WHEN EXISTS (SELECT 1 FROM @RB WHERE Status = 'Approved' AND UserID = @StudentID) THEN 1 ELSE 0 END);

DELETE dbo.TA_Requests WHERE ClassID = @ClassID;
DELETE dbo.Class_TA WHERE ClassID = @ClassID;
DELETE dbo.Class_Student WHERE ClassID = @ClassID;
DELETE dbo.Classes WHERE ClassID = @ClassID;
DELETE dbo.Users WHERE UserID IN (@TeacherID, @StudentID, @AdminID);

SELECT Assertion, Passed FROM @Results;
