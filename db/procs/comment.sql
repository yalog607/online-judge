CREATE OR ALTER PROCEDURE app.usp_Comment_List
    @ProblemID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        c.CommentID,
        c.ParentID,
        c.UserID,
        u.FullName,
        u.Avatar,
        c.Content,
        c.CreatedAt,
        (SELECT COUNT(*) FROM dbo.ProblemCommentLikes l WHERE l.CommentID = c.CommentID) AS LikeCount,
        CAST(CASE WHEN EXISTS (
            SELECT 1 FROM dbo.ProblemCommentLikes l WHERE l.CommentID = c.CommentID AND l.UserID = @UserID
        ) THEN 1 ELSE 0 END AS BIT) AS LikedByMe,
        CASE 
            WHEN u.Role = 'Admin' THEN 'Admin'
            WHEN u.Role = 'Teacher' THEN 'Teacher'
            WHEN u.Role = 'TA' AND EXISTS (
                SELECT 1 FROM dbo.Class_TA cta 
                JOIN dbo.Class_Problem cp ON cp.ClassID = cta.ClassID
                WHERE cp.ProblemID = @ProblemID AND cta.UserID_TA = c.UserID
            ) THEN 'TA'
            ELSE 'User'
        END AS AuthorRole
    FROM dbo.ProblemComments c
    JOIN dbo.Users u ON u.UserID = c.UserID
    WHERE c.ProblemID = @ProblemID
    ORDER BY c.CreatedAt DESC, c.CommentID DESC;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Comment_Add
    @ProblemID INT,
    @UserID INT,
    @ParentID INT = NULL,
    @Content NVARCHAR(2000)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF LEN(RTRIM(LTRIM(ISNULL(@Content, N'')))) = 0
        THROW 50070, N'Nội dung bình luận không được để trống.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Problems p
        LEFT JOIN dbo.Users u ON u.UserID = @UserID
        WHERE p.ProblemID = @ProblemID 
          AND (
            p.Status = 'Public' 
            OR p.CreatorID = @UserID 
            OR u.Role = 'Admin'
            OR EXISTS (
                SELECT 1 FROM dbo.Class_TA cta 
                JOIN dbo.Class_Problem cp ON cp.ClassID = cta.ClassID
                WHERE cp.ProblemID = @ProblemID AND cta.UserID_TA = @UserID
            )
            OR EXISTS (
                SELECT 1 FROM dbo.Classes c
                JOIN dbo.Class_Problem cp ON cp.ClassID = c.ClassID
                WHERE cp.ProblemID = @ProblemID AND c.TeacherID = @UserID
            )
            OR EXISTS (
                SELECT 1 FROM dbo.Class_Student cs
                JOIN dbo.Class_Problem cp ON cp.ClassID = cs.ClassID
                WHERE cp.ProblemID = @ProblemID AND cs.UserID = @UserID
            )
          )
    )
        THROW 50071, N'Bài tập không tồn tại hoặc bạn không có quyền bình luận.', 1;

    IF @ParentID IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.ProblemComments
        WHERE CommentID = @ParentID AND ProblemID = @ProblemID AND ParentID IS NULL
    )
        THROW 50072, N'Bình luận gốc không hợp lệ.', 1;

    INSERT dbo.ProblemComments (ProblemID, UserID, ParentID, Content)
    VALUES (@ProblemID, @UserID, @ParentID, LTRIM(RTRIM(@Content)));

    SELECT SCOPE_IDENTITY() AS CommentID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Comment_ToggleLike
    @CommentID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.ProblemComments WHERE CommentID = @CommentID)
        THROW 50073, N'Bình luận không tồn tại.', 1;

    IF EXISTS (SELECT 1 FROM dbo.ProblemCommentLikes WHERE CommentID = @CommentID AND UserID = @UserID)
        DELETE dbo.ProblemCommentLikes WHERE CommentID = @CommentID AND UserID = @UserID;
    ELSE
        INSERT dbo.ProblemCommentLikes (CommentID, UserID) VALUES (@CommentID, @UserID);
END
GO

-- Author, or Teacher/Admin (moderation), may delete. Replies go with their parent.
CREATE OR ALTER PROCEDURE app.usp_Comment_Delete
    @CommentID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Owner INT, @Role VARCHAR(20);
    SELECT @Owner = UserID FROM dbo.ProblemComments WHERE CommentID = @CommentID;
    SELECT @Role = Role FROM dbo.Users WHERE UserID = @UserID;

    IF @Owner IS NULL
        THROW 50073, N'Bình luận không tồn tại.', 1;
    IF @Owner <> @UserID AND ISNULL(@Role, 'User') NOT IN ('Teacher', 'Admin', 'TA')
        THROW 50074, N'Không có quyền xóa bình luận này.', 1;

    BEGIN TRANSACTION;
    DELETE dbo.ProblemComments WHERE ParentID = @CommentID;
    DELETE dbo.ProblemComments WHERE CommentID = @CommentID;
    COMMIT TRANSACTION;
END
GO
