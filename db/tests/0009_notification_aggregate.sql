DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @A INT, @Cnt INT, @Title NVARCHAR(200);

INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES ('ntfagg_a', 'x', 'ntfagg_a@test.com', N'Ntf Agg A', 'Teacher');
SET @A = SCOPE_IDENTITY();

DECLARE @Out TABLE (NotificationID BIGINT, UserID INT, CreatedAt DATETIME2, Title NVARCHAR(200), Updated BIT);

INSERT @Out EXEC app.usp_Notification_Aggregate
    @UserID = @A, @Type = 'contest_joined', @TitleTemplate = N'{n} nguoi da tham gia', @Body = N'Moi nhat: An', @Link = '/teacher/contests/1';
INSERT @Results VALUES ('First join creates one notification titled with 1',
    CASE WHEN (SELECT COUNT(*) FROM dbo.Notifications WHERE UserID = @A) = 1
          AND (SELECT Title FROM @Out) = N'1 nguoi da tham gia'
          AND (SELECT Updated FROM @Out) = 0 THEN 1 ELSE 0 END);

DELETE @Out;
INSERT @Out EXEC app.usp_Notification_Aggregate
    @UserID = @A, @Type = 'contest_joined', @TitleTemplate = N'{n} nguoi da tham gia', @Body = N'Moi nhat: Binh', @Link = '/teacher/contests/1';
INSERT @Out EXEC app.usp_Notification_Aggregate
    @UserID = @A, @Type = 'contest_joined', @TitleTemplate = N'{n} nguoi da tham gia', @Body = N'Moi nhat: Chi', @Link = '/teacher/contests/1';
SELECT @Cnt = COUNT(*), @Title = MAX(Title) FROM dbo.Notifications WHERE UserID = @A;
INSERT @Results VALUES ('Further joins stay one row and bump the count',
    CASE WHEN @Cnt = 1 AND @Title = N'3 nguoi da tham gia' THEN 1 ELSE 0 END);
INSERT @Results VALUES ('Body shows the latest joiner',
    CASE WHEN (SELECT Body FROM dbo.Notifications WHERE UserID = @A) = N'Moi nhat: Chi' THEN 1 ELSE 0 END);
INSERT @Results VALUES ('Repeat join is reported as an update',
    CASE WHEN (SELECT TOP 1 Updated FROM @Out ORDER BY NotificationID DESC) = 1 THEN 1 ELSE 0 END);

DELETE @Out;
INSERT @Out EXEC app.usp_Notification_Aggregate
    @UserID = @A, @Type = 'contest_joined', @TitleTemplate = N'{n} nguoi da tham gia', @Link = '/teacher/contests/2';
SELECT @Cnt = COUNT(*) FROM dbo.Notifications WHERE UserID = @A;
INSERT @Results VALUES ('Another contest gets its own notification', CASE WHEN @Cnt = 2 THEN 1 ELSE 0 END);

UPDATE dbo.Notifications SET IsRead = 1 WHERE UserID = @A AND Link = '/teacher/contests/1';
DELETE @Out;
INSERT @Out EXEC app.usp_Notification_Aggregate
    @UserID = @A, @Type = 'contest_joined', @TitleTemplate = N'{n} nguoi da tham gia', @Link = '/teacher/contests/1';
INSERT @Results VALUES ('After reading, counting restarts in a new notification',
    CASE WHEN (SELECT Title FROM @Out) = N'1 nguoi da tham gia'
          AND (SELECT COUNT(*) FROM dbo.Notifications WHERE UserID = @A AND Link = '/teacher/contests/1') = 2 THEN 1 ELSE 0 END);

DECLARE @Total TABLE (NotificationID BIGINT, UserID INT, CreatedAt DATETIME2, Title NVARCHAR(200), Updated BIT);
INSERT @Total EXEC app.usp_Notification_Aggregate
    @UserID = @A, @Type = 'contest_total', @TitleTemplate = N'Da co {n} nguoi', @Link = '/teacher/contests/9', @Count = 40;
DELETE @Total;
INSERT @Total EXEC app.usp_Notification_Aggregate
    @UserID = @A, @Type = 'contest_total', @TitleTemplate = N'Da co {n} nguoi', @Link = '/teacher/contests/9', @Count = 41;
INSERT @Results VALUES ('Explicit count is used as the total, not incremented',
    CASE WHEN (SELECT Title FROM @Total) = N'Da co 41 nguoi'
          AND (SELECT COUNT(*) FROM dbo.Notifications WHERE UserID = @A AND Type = 'contest_total') = 1 THEN 1 ELSE 0 END);

BEGIN TRY
    EXEC app.usp_Notification_Aggregate @UserID = @A, @Type = 'x', @TitleTemplate = N'khong co so', @Link = '/ok';
    INSERT @Results VALUES ('Template without placeholder is rejected', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Template without placeholder is rejected', 1);
END CATCH;

BEGIN TRY
    EXEC app.usp_Notification_Aggregate @UserID = @A, @Type = 'x', @TitleTemplate = N'{n}', @Link = '//evil.com';
    INSERT @Results VALUES ('Unsafe link is rejected', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Unsafe link is rejected', 1);
END CATCH;

DELETE dbo.Notifications WHERE UserID = @A;
DELETE dbo.Users WHERE UserID = @A;

SELECT Assertion, Passed FROM @Results;
