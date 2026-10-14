CREATE OR ALTER PROCEDURE app.usp_ContestComment_List
    @ContestID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Contests c
        WHERE c.ContestID = @ContestID
          AND (
              c.ClassID IS NULL
              OR c.CreatorID = @UserID
              OR EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role = 'Admin')
              OR EXISTS (SELECT 1 FROM dbo.Contest_User cu WHERE cu.ContestID = c.ContestID AND cu.UserID = @UserID)
              OR EXISTS (SELECT 1 FROM dbo.Classes cls WHERE cls.ClassID = c.ClassID AND cls.TeacherID = @UserID)
              OR EXISTS (SELECT 1 FROM dbo.Class_Student cs WHERE cs.ClassID = c.ClassID AND cs.UserID = @UserID)
              OR EXISTS (SELECT 1 FROM dbo.Class_TA ta WHERE ta.ClassID = c.ClassID AND ta.UserID_TA = @UserID)
          )
    ) THROW 50071, 'Ban khong co quyen xem binh luan ky thi nay.', 1;

    SELECT
        c.CommentID,
        c.ParentID,
        c.UserID,
        u.FullName,
        u.Avatar,
        c.Content,
        c.CreatedAt,
        (SELECT COUNT(*) FROM dbo.ContestCommentLikes l WHERE l.CommentID = c.CommentID) AS LikeCount,
        CAST(CASE WHEN EXISTS (
            SELECT 1 FROM dbo.ContestCommentLikes l WHERE l.CommentID = c.CommentID AND l.UserID = @UserID
        ) THEN 1 ELSE 0 END AS BIT) AS LikedByMe,
        CASE 
            WHEN u.Role = 'Admin' THEN 'Admin'
            WHEN u.Role = 'Teacher' THEN 'Teacher'
            WHEN u.Role = 'TA' AND EXISTS (
                SELECT 1 FROM dbo.Class_TA cta 
                JOIN dbo.Contests con ON con.ClassID = cta.ClassID
                WHERE con.ContestID = @ContestID AND cta.UserID_TA = c.UserID
            ) THEN 'TA'
            ELSE 'User'
        END AS AuthorRole
    FROM dbo.ContestComments c
    JOIN dbo.Users u ON u.UserID = c.UserID
    WHERE c.ContestID = @ContestID
    ORDER BY c.CreatedAt DESC, c.CommentID DESC;
END
GO

CREATE OR ALTER PROCEDURE app.usp_ContestComment_Add
    @ContestID INT,
    @UserID INT,
    @ParentID INT = NULL,
    @Content NVARCHAR(2000)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF LEN(RTRIM(LTRIM(ISNULL(@Content, N'')))) = 0
        THROW 50070, 'Noi dung binh luan khong duoc de trong.', 1;

    -- Người tạo, Admin, người đã tham gia và TA được phân công mới được bình luận.
    IF NOT EXISTS (
        SELECT 1 FROM dbo.Contests c
        LEFT JOIN dbo.Users u ON u.UserID = @UserID
        WHERE c.ContestID = @ContestID 
          AND (
            EXISTS (SELECT 1 FROM dbo.Contest_User cp WHERE cp.ContestID = @ContestID AND cp.UserID = @UserID)
            OR u.Role = 'Admin'
            OR EXISTS (SELECT 1 FROM dbo.Contests con WHERE con.ContestID = @ContestID AND con.CreatorID = @UserID)
            OR EXISTS (
                SELECT 1 FROM dbo.Class_TA cta 
                WHERE cta.ClassID = c.ClassID AND cta.UserID_TA = @UserID
            )
          )
    )
        THROW 50071, 'Ban chua tham gia ky thi hoac khong co quyen binh luan.', 1;

    IF @ParentID IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.ContestComments
        WHERE CommentID = @ParentID AND ContestID = @ContestID AND ParentID IS NULL
    )
        THROW 50072, 'Binh luan goc khong hop le.', 1;

    INSERT dbo.ContestComments (ContestID, UserID, ParentID, Content)
    VALUES (@ContestID, @UserID, @ParentID, LTRIM(RTRIM(@Content)));

    SELECT SCOPE_IDENTITY() AS CommentID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_ContestComment_ToggleLike
    @CommentID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.ContestComments WHERE CommentID = @CommentID)
        THROW 50073, 'Binh luan khong ton tai.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.ContestComments cc
        JOIN dbo.Contests c ON c.ContestID = cc.ContestID
        WHERE cc.CommentID = @CommentID
          AND (
              c.ClassID IS NULL
              OR c.CreatorID = @UserID
              OR EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role = 'Admin')
              OR EXISTS (SELECT 1 FROM dbo.Contest_User cu WHERE cu.ContestID = c.ContestID AND cu.UserID = @UserID)
              OR EXISTS (SELECT 1 FROM dbo.Classes cls WHERE cls.ClassID = c.ClassID AND cls.TeacherID = @UserID)
              OR EXISTS (SELECT 1 FROM dbo.Class_Student cs WHERE cs.ClassID = c.ClassID AND cs.UserID = @UserID)
              OR EXISTS (SELECT 1 FROM dbo.Class_TA ta WHERE ta.ClassID = c.ClassID AND ta.UserID_TA = @UserID)
          )
    ) THROW 50071, 'Ban khong co quyen thao tac binh luan ky thi nay.', 1;

    IF EXISTS (SELECT 1 FROM dbo.ContestCommentLikes WHERE CommentID = @CommentID AND UserID = @UserID)
        DELETE dbo.ContestCommentLikes WHERE CommentID = @CommentID AND UserID = @UserID;
    ELSE
        INSERT dbo.ContestCommentLikes (CommentID, UserID) VALUES (@CommentID, @UserID);
END
GO

CREATE OR ALTER PROCEDURE app.usp_ContestComment_Delete
    @CommentID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Owner INT, @ContestID INT, @CreatorID INT, @Role VARCHAR(20);
    SELECT @Owner = UserID, @ContestID = ContestID FROM dbo.ContestComments WHERE CommentID = @CommentID;
    SELECT @Role = Role FROM dbo.Users WHERE UserID = @UserID;
    SELECT @CreatorID = CreatorID FROM dbo.Contests WHERE ContestID = @ContestID;

    IF @Owner IS NULL
        THROW 50073, 'Binh luan khong ton tai.', 1;
    IF @Owner <> @UserID AND @CreatorID <> @UserID AND ISNULL(@Role, 'User') <> 'Admin'
        THROW 50074, 'Khong co quyen xoa binh luan nay.', 1;

    BEGIN TRANSACTION;
    DELETE dbo.ContestComments WHERE ParentID = @CommentID;
    DELETE dbo.ContestComments WHERE CommentID = @CommentID;
    COMMIT TRANSACTION;
END
GO
