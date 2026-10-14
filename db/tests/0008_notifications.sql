DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @A INT, @B INT, @N BIGINT, @Cnt INT;

INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES ('ntf_a', 'x', 'ntf_a@test.com', N'Ntf A', 'User');
SET @A = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES ('ntf_b', 'x', 'ntf_b@test.com', N'Ntf B', 'User');
SET @B = SCOPE_IDENTITY();

DECLARE @Created TABLE (NotificationID BIGINT, UserID INT, CreatedAt DATETIME2);
DECLARE @Ids NVARCHAR(100) = CONCAT(@A, ',', @B, ',', @A, ',999999999');

INSERT @Created EXEC app.usp_Notification_Create
    @UserIDs = @Ids, @Type = 'judge_result', @Title = N'Ket qua', @Body = N'AC', @Link = '/submissions/1';
INSERT @Results VALUES ('Creates one row per distinct existing user',
    CASE WHEN (SELECT COUNT(*) FROM @Created) = 2 THEN 1 ELSE 0 END);

DELETE @Created;
INSERT @Created EXEC app.usp_Notification_Create
    @UserIDs = @Ids, @Type = 'judge_result', @Title = N'Ket qua', @Body = N'AC', @Link = '/submissions/1';
INSERT @Results VALUES ('Identical unread notification is not duplicated',
    CASE WHEN (SELECT COUNT(*) FROM @Created) = 0 THEN 1 ELSE 0 END);

DECLARE @Unread TABLE (Unread INT);
INSERT @Unread EXEC app.usp_Notification_UnreadCount @UserID = @A;
INSERT @Results VALUES ('Unread count is 1',
    CASE WHEN (SELECT Unread FROM @Unread) = 1 THEN 1 ELSE 0 END);

SELECT @N = NotificationID FROM dbo.Notifications WHERE UserID = @A;

BEGIN TRY
    EXEC app.usp_Notification_MarkRead @UserID = @B, @NotificationID = @N;
    INSERT @Results VALUES ('Other user cannot mark read', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Other user cannot mark read', 1);
END CATCH;

EXEC app.usp_Notification_MarkRead @UserID = @A, @NotificationID = @N;
INSERT @Results VALUES ('Owner marks read',
    CASE WHEN (SELECT IsRead FROM dbo.Notifications WHERE NotificationID = @N) = 1 THEN 1 ELSE 0 END);

DELETE @Created;
INSERT @Created EXEC app.usp_Notification_Create
    @UserIDs = @Ids, @Type = 'judge_result', @Title = N'Ket qua', @Body = N'AC', @Link = '/submissions/1';
INSERT @Results VALUES ('Same notification is created again once the old one is read',
    CASE WHEN (SELECT COUNT(*) FROM @Created WHERE UserID = @A) = 1 THEN 1 ELSE 0 END);

DELETE @Created;
INSERT @Created EXEC app.usp_Notification_Create
    @UserIDs = @Ids, @Type = 'judge_result', @Title = N'Ket qua', @Body = N'WA', @Link = '/submissions/1';
INSERT @Results VALUES ('Same title and link with a different body is a new notification',
    CASE WHEN (SELECT COUNT(*) FROM @Created WHERE UserID = @B) = 1 THEN 1 ELSE 0 END);

EXEC app.usp_Notification_MarkAllRead @UserID = @A;
SELECT @Cnt = COUNT(*) FROM dbo.Notifications WHERE UserID = @A AND IsRead = 0;
INSERT @Results VALUES ('Mark all read leaves none unread', CASE WHEN @Cnt = 0 THEN 1 ELSE 0 END);
SELECT @Cnt = COUNT(*) FROM dbo.Notifications WHERE UserID = @B AND IsRead = 0;
INSERT @Results VALUES ('Mark all read does not touch other users', CASE WHEN @Cnt >= 1 THEN 1 ELSE 0 END);

DECLARE @List TABLE (NotificationID BIGINT, Type VARCHAR(40), Title NVARCHAR(200), Body NVARCHAR(500),
                     Link NVARCHAR(300), IsRead BIT, CreatedAt DATETIME2, Total INT);
INSERT @List EXEC app.usp_Notification_List @UserID = @A, @OnlyUnread = 0, @Offset = 0, @Limit = 20;
INSERT @Results VALUES ('List returns own rows only',
    CASE WHEN (SELECT COUNT(*) FROM @List) = 2 THEN 1 ELSE 0 END);

DECLARE @Bad TABLE (v NVARCHAR(300));
INSERT @Bad VALUES (N'https://evil.com'), (N'//evil.com'), (N'javascript:alert(1)'), (N'/ok\evil'), (N'relative/path');
DECLARE @Link NVARCHAR(300), @Rejected INT = 0;
DECLARE c CURSOR LOCAL FOR SELECT v FROM @Bad;
OPEN c; FETCH NEXT FROM c INTO @Link;
WHILE @@FETCH_STATUS = 0
BEGIN
    BEGIN TRY
        EXEC app.usp_Notification_Create @UserIDs = @A, @Type = 'x', @Title = N't', @Link = @Link;
    END TRY
    BEGIN CATCH
        SET @Rejected += 1;
    END CATCH;
    FETCH NEXT FROM c INTO @Link;
END;
CLOSE c; DEALLOCATE c;
INSERT @Results VALUES ('Unsafe links are rejected', CASE WHEN @Rejected = 5 THEN 1 ELSE 0 END);

BEGIN TRY
    EXEC app.usp_Notification_Create @UserIDs = @A, @Type = 'x', @Title = N'   ';
    INSERT @Results VALUES ('Blank title is rejected', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Blank title is rejected', 1);
END CATCH;

DELETE dbo.Notifications WHERE UserID IN (@A, @B);
DELETE dbo.Users WHERE UserID IN (@A, @B);

SELECT Assertion, Passed FROM @Results;
