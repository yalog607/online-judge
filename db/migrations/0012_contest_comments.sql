CREATE TABLE dbo.ContestComments (
    CommentID    INT IDENTITY(1,1) CONSTRAINT PK_ContestComments PRIMARY KEY,
    ContestID    INT NOT NULL CONSTRAINT FK_CComments_Contest REFERENCES dbo.Contests(ContestID) ON DELETE CASCADE,
    UserID       INT NOT NULL CONSTRAINT FK_CComments_User REFERENCES dbo.Users(UserID),
    ParentID     INT NULL CONSTRAINT FK_CComments_Parent REFERENCES dbo.ContestComments(CommentID),
    Content      NVARCHAR(2000) NOT NULL,
    CreatedAt    DATETIME2(0) NOT NULL CONSTRAINT DF_CComments_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_CComments_Content CHECK (LEN(RTRIM(LTRIM(Content))) > 0)
);
GO

CREATE INDEX IX_CComments_Contest ON dbo.ContestComments (ContestID, CreatedAt DESC);
GO

CREATE TABLE dbo.ContestCommentLikes (
    CommentID    INT NOT NULL CONSTRAINT FK_CCLikes_Comment REFERENCES dbo.ContestComments(CommentID) ON DELETE CASCADE,
    UserID       INT NOT NULL CONSTRAINT FK_CCLikes_User REFERENCES dbo.Users(UserID),
    CreatedAt    DATETIME2(0) NOT NULL CONSTRAINT DF_CCLikes_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ContestCommentLikes PRIMARY KEY (CommentID, UserID)
);
GO
