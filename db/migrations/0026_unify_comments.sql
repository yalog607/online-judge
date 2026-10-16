-- Gop binh luan bai tap + contest ve 1 bang dbo.Comments / dbo.CommentLikes.
-- Bo he thong binh luan cu (Comments/CommentLikes/CommentReports tu 0001) va chuc nang report.

IF OBJECT_ID(N'dbo.trg_Comment_CheckHidden', N'TR') IS NOT NULL DROP TRIGGER dbo.trg_Comment_CheckHidden;
GO
IF OBJECT_ID(N'dbo.CommentReports', N'U') IS NOT NULL DROP TABLE dbo.CommentReports;
IF OBJECT_ID(N'dbo.CommentLikes', N'U') IS NOT NULL DROP TABLE dbo.CommentLikes;
IF OBJECT_ID(N'dbo.Comments', N'U') IS NOT NULL DROP TABLE dbo.Comments;
GO

CREATE TABLE dbo.Comments (
    CommentID  INT IDENTITY(1,1) CONSTRAINT PK_Comments PRIMARY KEY,
    ProblemID  INT NULL CONSTRAINT FK_Comments_Problem REFERENCES dbo.Problems(ProblemID) ON DELETE CASCADE,
    ContestID  INT NULL CONSTRAINT FK_Comments_Contest REFERENCES dbo.Contests(ContestID) ON DELETE CASCADE,
    UserID     INT NOT NULL CONSTRAINT FK_Comments_User REFERENCES dbo.Users(UserID),
    ParentID   INT NULL CONSTRAINT FK_Comments_Parent REFERENCES dbo.Comments(CommentID),
    Content    NVARCHAR(2000) NOT NULL,
    CreatedAt  DATETIME2(0) NOT NULL CONSTRAINT DF_Comments_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Comments_Content CHECK (LEN(RTRIM(LTRIM(Content))) > 0),
    CONSTRAINT CK_Comments_Target CHECK ((ProblemID IS NULL AND ContestID IS NOT NULL) OR (ProblemID IS NOT NULL AND ContestID IS NULL))
);
CREATE INDEX IX_Comments_Problem ON dbo.Comments (ProblemID, CreatedAt DESC) WHERE ProblemID IS NOT NULL;
CREATE INDEX IX_Comments_Contest ON dbo.Comments (ContestID, CreatedAt DESC) WHERE ContestID IS NOT NULL;
CREATE INDEX IX_Comments_Parent ON dbo.Comments (ParentID) WHERE ParentID IS NOT NULL;
GO

CREATE TABLE dbo.CommentLikes (
    CommentID  INT NOT NULL CONSTRAINT FK_CommentLikes_Comment REFERENCES dbo.Comments(CommentID) ON DELETE CASCADE,
    UserID     INT NOT NULL CONSTRAINT FK_CommentLikes_User REFERENCES dbo.Users(UserID),
    CreatedAt  DATETIME2(0) NOT NULL CONSTRAINT DF_CommentLikes_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_CommentLikes PRIMARY KEY (CommentID, UserID)
);
GO

-- Chuyen du lieu: binh luan bai tap giu nguyen ID, binh luan contest cong them offset.
-- Trong mot batch vi IDENTITY_INSERT gan voi session.
DECLARE @Offset INT = ISNULL((SELECT MAX(CommentID) FROM dbo.ProblemComments), 0);

SET IDENTITY_INSERT dbo.Comments ON;

INSERT dbo.Comments (CommentID, ProblemID, ContestID, UserID, ParentID, Content, CreatedAt)
SELECT CommentID, ProblemID, NULL, UserID, ParentID, Content, CreatedAt FROM dbo.ProblemComments;

INSERT dbo.Comments (CommentID, ProblemID, ContestID, UserID, ParentID, Content, CreatedAt)
SELECT CommentID + @Offset, NULL, ContestID, UserID,
       CASE WHEN ParentID IS NULL THEN NULL ELSE ParentID + @Offset END,
       Content, CreatedAt
FROM dbo.ContestComments;

SET IDENTITY_INSERT dbo.Comments OFF;

INSERT dbo.CommentLikes (CommentID, UserID, CreatedAt)
SELECT CommentID, UserID, CreatedAt FROM dbo.ProblemCommentLikes;

INSERT dbo.CommentLikes (CommentID, UserID, CreatedAt)
SELECT CommentID + @Offset, UserID, CreatedAt FROM dbo.ContestCommentLikes;
GO

DROP TABLE dbo.ProblemCommentLikes;
DROP TABLE dbo.ContestCommentLikes;
DROP TABLE dbo.ProblemComments;
DROP TABLE dbo.ContestComments;
GO

IF OBJECT_ID(N'app.usp_ContestComment_List', N'P') IS NOT NULL DROP PROCEDURE app.usp_ContestComment_List;
IF OBJECT_ID(N'app.usp_ContestComment_Add', N'P') IS NOT NULL DROP PROCEDURE app.usp_ContestComment_Add;
IF OBJECT_ID(N'app.usp_ContestComment_ToggleLike', N'P') IS NOT NULL DROP PROCEDURE app.usp_ContestComment_ToggleLike;
IF OBJECT_ID(N'app.usp_ContestComment_Delete', N'P') IS NOT NULL DROP PROCEDURE app.usp_ContestComment_Delete;
GO
