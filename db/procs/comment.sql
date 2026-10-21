-- Binh luan dung chung cho bai tap (@ProblemID) va ky thi (@ContestID): truyen dung mot trong hai.
-- Quy tac quyen khac nhau theo loai doi tuong, xem tung nhanh ben duoi.

CREATE OR ALTER PROCEDURE app.usp_Comment_List
    @ProblemID INT = NULL,
    @ContestID INT = NULL,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF (@ProblemID IS NULL AND @ContestID IS NULL) OR (@ProblemID IS NOT NULL AND @ContestID IS NOT NULL)
        THROW 50075, N'Đối tượng bình luận không hợp lệ.', 1;

    IF @ContestID IS NOT NULL AND NOT EXISTS (
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
    ) THROW 50071, N'Bạn không có quyền xem bình luận kỳ thi này.', 1;

    SELECT
        c.CommentID,
        c.ParentID,
        c.UserID,
        u.FullName,
        u.Avatar,
        c.Content,
        c.CreatedAt,
        (SELECT COUNT(*) FROM dbo.CommentLikes l WHERE l.CommentID = c.CommentID) AS LikeCount,
        CAST(CASE WHEN EXISTS (
            SELECT 1 FROM dbo.CommentLikes l WHERE l.CommentID = c.CommentID AND l.UserID = @UserID
        ) THEN 1 ELSE 0 END AS BIT) AS LikedByMe,
        CASE
            WHEN u.Role = 'Admin' THEN 'Admin'
            WHEN u.Role = 'Teacher' THEN 'Teacher'
            WHEN u.Role = 'TA' AND (
                (@ProblemID IS NOT NULL AND EXISTS (
                    SELECT 1 FROM dbo.Class_TA cta
                    JOIN dbo.Class_Problem cp ON cp.ClassID = cta.ClassID
                    WHERE cp.ProblemID = @ProblemID AND cta.UserID_TA = c.UserID
                ))
                OR (@ContestID IS NOT NULL AND EXISTS (
                    SELECT 1 FROM dbo.Class_TA cta
                    JOIN dbo.Contests con ON con.ClassID = cta.ClassID
                    WHERE con.ContestID = @ContestID AND cta.UserID_TA = c.UserID
                ))
            ) THEN 'TA'
            ELSE 'User'
        END AS AuthorRole
    FROM dbo.Comments c
    JOIN dbo.Users u ON u.UserID = c.UserID
    WHERE (@ProblemID IS NOT NULL AND c.ProblemID = @ProblemID)
       OR (@ContestID IS NOT NULL AND c.ContestID = @ContestID)
    ORDER BY c.CreatedAt DESC, c.CommentID DESC;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Comment_Add
    @ProblemID INT = NULL,
    @ContestID INT = NULL,
    @UserID INT,
    @ParentID INT = NULL,
    @Content NVARCHAR(2000)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF (@ProblemID IS NULL AND @ContestID IS NULL) OR (@ProblemID IS NOT NULL AND @ContestID IS NOT NULL)
        THROW 50075, N'Đối tượng bình luận không hợp lệ.', 1;

    IF LEN(RTRIM(LTRIM(ISNULL(@Content, N'')))) = 0
        THROW 50070, N'Nội dung bình luận không được để trống.', 1;

    IF @ProblemID IS NOT NULL AND NOT EXISTS (
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

    -- Người tạo, Admin, người đã tham gia và TA được phân công mới được bình luận kỳ thi.
    IF @ContestID IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.Contests c
        LEFT JOIN dbo.Users u ON u.UserID = @UserID
        WHERE c.ContestID = @ContestID
          AND (
            EXISTS (SELECT 1 FROM dbo.Contest_User cu WHERE cu.ContestID = @ContestID AND cu.UserID = @UserID)
            OR u.Role = 'Admin'
            OR c.CreatorID = @UserID
            OR EXISTS (
                SELECT 1 FROM dbo.Class_TA cta
                WHERE cta.ClassID = c.ClassID AND cta.UserID_TA = @UserID
            )
          )
    )
        THROW 50071, N'Bạn chưa tham gia kỳ thi hoặc không có quyền bình luận.', 1;

    IF @ParentID IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.Comments
        WHERE CommentID = @ParentID
          AND ParentID IS NULL
          AND ((@ProblemID IS NOT NULL AND ProblemID = @ProblemID)
            OR (@ContestID IS NOT NULL AND ContestID = @ContestID))
    )
        THROW 50072, N'Bình luận gốc không hợp lệ.', 1;

    INSERT dbo.Comments (ProblemID, ContestID, UserID, ParentID, Content)
    VALUES (@ProblemID, @ContestID, @UserID, @ParentID, LTRIM(RTRIM(@Content)));

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

    DECLARE @ContestID INT, @Found BIT = 0;
    SELECT @ContestID = ContestID, @Found = 1 FROM dbo.Comments WHERE CommentID = @CommentID;

    IF @Found = 0
        THROW 50073, N'Bình luận không tồn tại.', 1;

    IF @ContestID IS NOT NULL AND NOT EXISTS (
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
    ) THROW 50071, N'Bạn không có quyền thao tác bình luận kỳ thi này.', 1;

    IF EXISTS (SELECT 1 FROM dbo.CommentLikes WHERE CommentID = @CommentID AND UserID = @UserID)
        DELETE dbo.CommentLikes WHERE CommentID = @CommentID AND UserID = @UserID;
    ELSE
        INSERT dbo.CommentLikes (CommentID, UserID) VALUES (@CommentID, @UserID);
END
GO

-- Bai tap: tac gia hoac Teacher/TA/Admin (kiem duyet) duoc xoa.
-- Ky thi: tac gia, nguoi tao ky thi hoac Admin duoc xoa.
-- Reply di kem binh luan goc.
CREATE OR ALTER PROCEDURE app.usp_Comment_Delete
    @CommentID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Owner INT, @ContestID INT, @CreatorID INT, @Role VARCHAR(20);
    SELECT @Owner = UserID, @ContestID = ContestID FROM dbo.Comments WHERE CommentID = @CommentID;
    SELECT @Role = Role FROM dbo.Users WHERE UserID = @UserID;

    IF @Owner IS NULL
        THROW 50073, N'Bình luận không tồn tại.', 1;

    IF @ContestID IS NULL
    BEGIN
        IF @Owner <> @UserID AND ISNULL(@Role, 'User') NOT IN ('Teacher', 'Admin', 'TA')
            THROW 50074, N'Không có quyền xóa bình luận này.', 1;
    END
    ELSE
    BEGIN
        SELECT @CreatorID = CreatorID FROM dbo.Contests WHERE ContestID = @ContestID;
        IF @Owner <> @UserID AND ISNULL(@CreatorID, 0) <> @UserID AND ISNULL(@Role, 'User') <> 'Admin'
            THROW 50074, N'Không có quyền xóa bình luận này.', 1;
    END

    BEGIN TRANSACTION;
    DELETE dbo.Comments WHERE ParentID = @CommentID;
    DELETE dbo.Comments WHERE CommentID = @CommentID;
    COMMIT TRANSACTION;
END
GO


CREATE OR ALTER PROCEDURE app.usp_Comment_Create
    @ProblemID INT = NULL,
    @ContestID INT = NULL,
    @UserID INT,
    @Content NVARCHAR(2000),
    @ParentID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    EXEC app.usp_Comment_Add
        @ProblemID = @ProblemID,
        @ContestID = @ContestID,
        @UserID = @UserID,
        @ParentID = @ParentID,
        @Content = @Content;
END;
GO
