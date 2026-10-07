CREATE TABLE dbo.ProblemComments (
    CommentID    INT IDENTITY(1,1) CONSTRAINT PK_ProblemComments PRIMARY KEY,
    ProblemID    INT NOT NULL CONSTRAINT FK_PComments_Problem REFERENCES dbo.Problems(ProblemID) ON DELETE CASCADE,
    UserID       INT NOT NULL CONSTRAINT FK_PComments_User REFERENCES dbo.Users(UserID),
    ParentID     INT NULL CONSTRAINT FK_PComments_Parent REFERENCES dbo.ProblemComments(CommentID),
    Content      NVARCHAR(2000) NOT NULL,
    CreatedAt    DATETIME2(0) NOT NULL CONSTRAINT DF_PComments_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_PComments_Content CHECK (LEN(RTRIM(LTRIM(Content))) > 0)
);
GO

CREATE INDEX IX_PComments_Problem ON dbo.ProblemComments (ProblemID, CreatedAt DESC);
GO

CREATE TABLE dbo.ProblemCommentLikes (
    CommentID    INT NOT NULL CONSTRAINT FK_PCLikes_Comment REFERENCES dbo.ProblemComments(CommentID) ON DELETE CASCADE,
    UserID       INT NOT NULL CONSTRAINT FK_PCLikes_User REFERENCES dbo.Users(UserID),
    CreatedAt    DATETIME2(0) NOT NULL CONSTRAINT DF_PCLikes_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ProblemCommentLikes PRIMARY KEY (CommentID, UserID)
);
GO
