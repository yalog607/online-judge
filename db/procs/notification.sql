CREATE OR ALTER PROCEDURE app.usp_Notification_Create
    @UserIDs NVARCHAR(MAX),
    @Type    VARCHAR(40),
    @Title   NVARCHAR(200),
    @Body    NVARCHAR(500) = NULL,
    @Link    NVARCHAR(300) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @Title = LTRIM(RTRIM(ISNULL(@Title, N'')));
    IF LEN(@Title) = 0
        THROW 50180, 'Tieu de thong bao khong duoc de trong.', 1;

    IF @Link IS NOT NULL AND (
           @Link NOT LIKE N'/%'
        OR @Link LIKE N'//%'
        OR @Link LIKE N'%://%'
        OR @Link LIKE N'%\%'
        OR @Link LIKE N'%[<>"]%'
    )
        THROW 50180, 'Duong dan thong bao khong hop le.', 1;

    -- Recipients are existing users only; an identical unread notification is not repeated.
    INSERT dbo.Notifications (UserID, Type, Title, Body, Link)
    OUTPUT inserted.NotificationID, inserted.UserID, inserted.CreatedAt
    SELECT DISTINCT u.UserID, @Type, @Title, @Body, @Link
    FROM (
        SELECT TRY_CAST(LTRIM(RTRIM(value)) AS INT) AS UserID
        FROM STRING_SPLIT(@UserIDs, ',')
    ) ids
    JOIN dbo.Users u ON u.UserID = ids.UserID
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.Notifications n
        WHERE n.UserID = u.UserID AND n.IsRead = 0 AND n.Type = @Type
          AND n.Title = @Title AND ISNULL(n.Body, N'') = ISNULL(@Body, N'')
          AND ISNULL(n.Link, N'') = ISNULL(@Link, N'')
    );
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_List
    @UserID     INT,
    @OnlyUnread BIT = 0,
    @Offset     INT = 0,
    @Limit      INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    IF @Offset < 0 SET @Offset = 0;
    IF @Limit < 1 SET @Limit = 20;
    IF @Limit > 100 SET @Limit = 100;

    SELECT NotificationID, Type, Title, Body, Link, IsRead, CreatedAt,
           COUNT(*) OVER () AS Total
    FROM dbo.Notifications
    WHERE UserID = @UserID AND (@OnlyUnread = 0 OR IsRead = 0)
    ORDER BY CreatedAt DESC, NotificationID DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_UnreadCount
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT COUNT(*) AS Unread FROM dbo.Notifications WHERE UserID = @UserID AND IsRead = 0;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_MarkRead
    @UserID         INT,
    @NotificationID BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Notifications WHERE NotificationID = @NotificationID AND UserID = @UserID)
        THROW 50181, 'Thong bao khong ton tai.', 1;

    UPDATE dbo.Notifications
    SET IsRead = 1, ReadAt = SYSUTCDATETIME()
    WHERE NotificationID = @NotificationID AND UserID = @UserID AND IsRead = 0;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_MarkAllRead
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Notifications
    SET IsRead = 1, ReadAt = SYSUTCDATETIME()
    WHERE UserID = @UserID AND IsRead = 0;
END
GO

-- Read-only lookups used by src/modules/notification/events.ts to resolve recipients.
CREATE OR ALTER PROCEDURE app.usp_Notification_SubmissionInfo
    @SubmissionID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT s.UserID, s.ProblemID, p.Title AS ProblemTitle
    FROM dbo.Submissions s
    JOIN dbo.Problems p ON p.ProblemID = s.ProblemID
    WHERE s.SubmissionID = @SubmissionID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_ProblemInfo
    @ProblemID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CreatorID, Title, RejectionReason FROM dbo.Problems WHERE ProblemID = @ProblemID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_CommentInfo
    @CommentID INT,
    @UserID    INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.UserID AS AuthorID, c.ProblemID, c.ParentID,
           CAST(CASE WHEN EXISTS (
               SELECT 1 FROM dbo.ProblemCommentLikes l WHERE l.CommentID = c.CommentID AND l.UserID = @UserID
           ) THEN 1 ELSE 0 END AS BIT) AS LikedByUser
    FROM dbo.ProblemComments c
    WHERE c.CommentID = @CommentID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_ClassInfo
    @ClassID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ClassName FROM dbo.Classes WHERE ClassID = @ClassID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_ClassStudents
    @ClassID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UserID FROM dbo.Class_Student WHERE ClassID = @ClassID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_ContestInfo
    @ContestID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CreatorID, ContestName FROM dbo.Contests WHERE ContestID = @ContestID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_ContestParticipants
    @ContestID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UserID FROM dbo.Contest_User WHERE ContestID = @ContestID;
END
GO

-- Folds repeated events into ONE unread notification per (user, type, link): the title template's
-- {n} placeholder is replaced with the running count. Once the user has read it, counting restarts
-- in a new notification. Returns the affected row; Updated = 1 when an existing row was bumped.
CREATE OR ALTER PROCEDURE app.usp_Notification_Aggregate
    @UserID        INT,
    @Type          VARCHAR(40),
    @TitleTemplate NVARCHAR(200),
    @Body          NVARCHAR(500) = NULL,
    @Link          NVARCHAR(300)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @TitleTemplate IS NULL OR CHARINDEX(N'{n}', @TitleTemplate) = 0
        THROW 50180, 'Mau tieu de thong bao phai chua {n}.', 1;
    IF LEN(REPLACE(@TitleTemplate, N'{n}', N'2147483647')) > 200
        THROW 50180, 'Tieu de thong bao qua dai.', 1;

    IF @Link IS NULL OR @Link NOT LIKE N'/%' OR @Link LIKE N'//%' OR @Link LIKE N'%://%'
       OR @Link LIKE N'%\%' OR @Link LIKE N'%[<>"]%'
        THROW 50180, 'Duong dan thong bao khong hop le.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID) RETURN;

    BEGIN TRANSACTION;

    -- SERIALIZABLE range lock: two concurrent joins must not both create the first row.
    UPDATE TOP (1) dbo.Notifications WITH (UPDLOCK, SERIALIZABLE)
    SET GroupCount = GroupCount + 1,
        Title = REPLACE(@TitleTemplate, N'{n}', CAST(GroupCount + 1 AS NVARCHAR(10))),
        Body = @Body,
        CreatedAt = SYSUTCDATETIME()
    OUTPUT inserted.NotificationID, inserted.UserID, inserted.CreatedAt, inserted.Title, CAST(1 AS BIT) AS Updated
    WHERE UserID = @UserID AND Type = @Type AND IsRead = 0 AND Link = @Link;

    IF @@ROWCOUNT = 0
        INSERT dbo.Notifications (UserID, Type, Title, Body, Link, GroupCount)
        OUTPUT inserted.NotificationID, inserted.UserID, inserted.CreatedAt, inserted.Title, CAST(0 AS BIT) AS Updated
        VALUES (@UserID, @Type, REPLACE(@TitleTemplate, N'{n}', N'1'), @Body, @Link, 1);

    COMMIT TRANSACTION;
END
GO
