CREATE SCHEMA app;
GO

CREATE TABLE dbo.Users (
    UserID       INT IDENTITY(1,1) CONSTRAINT PK_Users PRIMARY KEY,
    Username     VARCHAR(50)   NOT NULL,
    Password     VARCHAR(255)  NOT NULL,
    Email        VARCHAR(100)  NOT NULL,
    FullName     NVARCHAR(100) NOT NULL,
    Role         VARCHAR(20)   NOT NULL CONSTRAINT DF_Users_Role DEFAULT 'User',
    Status       VARCHAR(20)   NOT NULL CONSTRAINT DF_Users_Status DEFAULT 'Active',
    Avatar       VARCHAR(255)  NULL,
    CreatedAt    DATETIME2(0)  NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Users_Username UNIQUE (Username),
    CONSTRAINT UQ_Users_Email UNIQUE (Email),
    CONSTRAINT CK_Users_Role CHECK (Role IN ('User','Teacher','Admin')),
    CONSTRAINT CK_Users_Status CHECK (Status IN ('Active','Locked')),
    CONSTRAINT CK_Users_Email CHECK (Email LIKE '_%@_%._%')
);

CREATE TABLE dbo.Sessions (
    SessionID    UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Sessions PRIMARY KEY DEFAULT NEWID(),
    UserID       INT NOT NULL CONSTRAINT FK_Sessions_User REFERENCES dbo.Users(UserID) ON DELETE CASCADE,
    ActorID      INT NULL CONSTRAINT FK_Sessions_Actor REFERENCES dbo.Users(UserID),
    CreatedAt    DATETIME2(0) NOT NULL CONSTRAINT DF_Sessions_CreatedAt DEFAULT SYSUTCDATETIME(),
    ExpiresAt    DATETIME2(0) NOT NULL,
    RevokedAt    DATETIME2(0) NULL
);
CREATE INDEX IX_Sessions_User ON dbo.Sessions (UserID) WHERE RevokedAt IS NULL;

CREATE TABLE dbo.OtpCodes (
    OtpID        INT IDENTITY(1,1) CONSTRAINT PK_OtpCodes PRIMARY KEY,
    Email        VARCHAR(100) NOT NULL,
    Purpose      VARCHAR(20)  NOT NULL,
    CodeHash     VARCHAR(255) NOT NULL,
    Payload      NVARCHAR(MAX) NULL,
    Attempts     INT NOT NULL CONSTRAINT DF_Otp_Attempts DEFAULT 0,
    CreatedAt    DATETIME2(0) NOT NULL CONSTRAINT DF_Otp_CreatedAt DEFAULT SYSUTCDATETIME(),
    ExpiresAt    DATETIME2(0) NOT NULL,
    ConsumedAt   DATETIME2(0) NULL,
    CONSTRAINT CK_Otp_Purpose CHECK (Purpose IN ('Register','Reset')),
    CONSTRAINT CK_Otp_Attempts CHECK (Attempts >= 0)
);
CREATE INDEX IX_Otp_Email ON dbo.OtpCodes (Email, Purpose, CreatedAt DESC) WHERE ConsumedAt IS NULL;

CREATE TABLE dbo.Classes (
    ClassID        INT IDENTITY(1,1) CONSTRAINT PK_Classes PRIMARY KEY,
    TeacherID      INT NOT NULL CONSTRAINT FK_Classes_Teacher REFERENCES dbo.Users(UserID),
    InviteCode     VARCHAR(20)   NOT NULL,
    ClassName      NVARCHAR(150) NOT NULL,
    Description    NVARCHAR(MAX) NULL,
    IsPublic       BIT NOT NULL CONSTRAINT DF_Classes_IsPublic DEFAULT 1,
    ApprovalStatus VARCHAR(20) NOT NULL CONSTRAINT DF_Classes_Approval DEFAULT 'Pending',
    CreatedAt      DATETIME2(0) NOT NULL CONSTRAINT DF_Classes_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Classes_InviteCode UNIQUE (InviteCode),
    CONSTRAINT CK_Classes_Approval CHECK (ApprovalStatus IN ('Pending','Approved','Rejected'))
);
CREATE INDEX IX_Classes_Teacher ON dbo.Classes (TeacherID);
CREATE INDEX IX_Classes_Public ON dbo.Classes (ApprovalStatus, IsPublic) INCLUDE (ClassName);

CREATE TABLE dbo.Class_Student (
    ClassID         INT NOT NULL CONSTRAINT FK_CS_Class REFERENCES dbo.Classes(ClassID) ON DELETE CASCADE,
    UserID          INT NOT NULL CONSTRAINT FK_CS_User REFERENCES dbo.Users(UserID),
    JoinDate        DATETIME2(0) NOT NULL CONSTRAINT DF_CS_JoinDate DEFAULT SYSUTCDATETIME(),
    ProgressPercent FLOAT NOT NULL CONSTRAINT DF_CS_Progress DEFAULT 0.0,
    CONSTRAINT PK_Class_Student PRIMARY KEY (ClassID, UserID),
    CONSTRAINT CK_CS_Progress CHECK (ProgressPercent BETWEEN 0 AND 100)
);
CREATE INDEX IX_CS_User ON dbo.Class_Student (UserID);

CREATE TABLE dbo.Problems (
    ProblemID    INT IDENTITY(1,1) CONSTRAINT PK_Problems PRIMARY KEY,
    CreatorID    INT NOT NULL CONSTRAINT FK_Problems_Creator REFERENCES dbo.Users(UserID),
    Title        NVARCHAR(200) NOT NULL,
    Statement    NVARCHAR(MAX) NOT NULL,
    InputFormat  NVARCHAR(MAX) NULL,
    OutputFormat NVARCHAR(MAX) NULL,
    TimeLimit    INT NOT NULL CONSTRAINT DF_Problems_Time DEFAULT 1000,
    MemoryLimit  INT NOT NULL CONSTRAINT DF_Problems_Mem DEFAULT 256,
    Tags         NVARCHAR(200) NULL,
    Difficulty   VARCHAR(20) NOT NULL,
    Status       VARCHAR(20) NOT NULL CONSTRAINT DF_Problems_Status DEFAULT 'Public',
    CreatedAt    DATETIME2(0) NOT NULL CONSTRAINT DF_Problems_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Problems_Time CHECK (TimeLimit > 0),
    CONSTRAINT CK_Problems_Mem CHECK (MemoryLimit > 0),
    CONSTRAINT CK_Problems_Diff CHECK (Difficulty IN ('Easy','Medium','Hard')),
    CONSTRAINT CK_Problems_Status CHECK (Status IN ('Public','Private','Hidden'))
);
CREATE INDEX IX_Problems_Filter ON dbo.Problems (Status, Difficulty) INCLUDE (Title, Tags);
CREATE INDEX IX_Problems_Creator ON dbo.Problems (CreatorID);

CREATE TABLE dbo.Class_Problem (
    ClassID      INT NOT NULL CONSTRAINT FK_CP_Class REFERENCES dbo.Classes(ClassID) ON DELETE CASCADE,
    ProblemID    INT NOT NULL CONSTRAINT FK_CP_Problem REFERENCES dbo.Problems(ProblemID),
    AssignedDate DATETIME2(0) NOT NULL CONSTRAINT DF_CP_Assigned DEFAULT SYSUTCDATETIME(),
    DueDate      DATETIME2(0) NULL,
    IsClosed     BIT NOT NULL CONSTRAINT DF_CP_Closed DEFAULT 0,
    CONSTRAINT PK_Class_Problem PRIMARY KEY (ClassID, ProblemID),
    CONSTRAINT CK_CP_Due CHECK (DueDate IS NULL OR DueDate >= AssignedDate)
);
CREATE INDEX IX_CP_Problem ON dbo.Class_Problem (ProblemID);

CREATE TABLE dbo.Testcases (
    TestCaseID     INT IDENTITY(1,1) CONSTRAINT PK_Testcases PRIMARY KEY,
    ProblemID      INT NOT NULL CONSTRAINT FK_Testcases_Problem REFERENCES dbo.Problems(ProblemID) ON DELETE CASCADE,
    InputData      NVARCHAR(MAX) NOT NULL,
    ExpectedOutput NVARCHAR(MAX) NOT NULL,
    IsHidden       BIT NOT NULL CONSTRAINT DF_Testcases_Hidden DEFAULT 1,
    OrderIndex     INT NOT NULL CONSTRAINT DF_Testcases_Order DEFAULT 0
);
CREATE INDEX IX_Testcases_Problem ON dbo.Testcases (ProblemID, OrderIndex);

CREATE TABLE dbo.Contests (
    ContestID    INT IDENTITY(1,1) CONSTRAINT PK_Contests PRIMARY KEY,
    CreatorID    INT NOT NULL CONSTRAINT FK_Contests_Creator REFERENCES dbo.Users(UserID),
    ContestName  NVARCHAR(200) NOT NULL,
    Description  NVARCHAR(MAX) NULL,
    StartTime    DATETIME2(0) NOT NULL,
    EndTime      DATETIME2(0) NOT NULL,
    Password     VARCHAR(255) NULL,
    CreatedAt    DATETIME2(0) NOT NULL CONSTRAINT DF_Contests_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Contests_Time CHECK (EndTime > StartTime)
);
CREATE INDEX IX_Contests_Time ON dbo.Contests (StartTime, EndTime);

CREATE TABLE dbo.Contest_Problem (
    ContestID  INT NOT NULL CONSTRAINT FK_ContP_Contest REFERENCES dbo.Contests(ContestID) ON DELETE CASCADE,
    ProblemID  INT NOT NULL CONSTRAINT FK_ContP_Problem REFERENCES dbo.Problems(ProblemID),
    MaxScore   INT NOT NULL CONSTRAINT DF_ContP_Score DEFAULT 100,
    OrderIndex INT NOT NULL CONSTRAINT DF_ContP_Order DEFAULT 0,
    CONSTRAINT PK_Contest_Problem PRIMARY KEY (ContestID, ProblemID),
    CONSTRAINT CK_ContP_Score CHECK (MaxScore > 0)
);
CREATE INDEX IX_ContP_Problem ON dbo.Contest_Problem (ProblemID);

CREATE TABLE dbo.Contest_User (
    ContestID   INT NOT NULL CONSTRAINT FK_ContU_Contest REFERENCES dbo.Contests(ContestID) ON DELETE CASCADE,
    UserID      INT NOT NULL CONSTRAINT FK_ContU_User REFERENCES dbo.Users(UserID),
    TotalScore  INT NOT NULL CONSTRAINT DF_ContU_Score DEFAULT 0,
    PenaltyTime INT NOT NULL CONSTRAINT DF_ContU_Penalty DEFAULT 0,
    CONSTRAINT PK_Contest_User PRIMARY KEY (ContestID, UserID),
    CONSTRAINT CK_ContU_Score CHECK (TotalScore >= 0),
    CONSTRAINT CK_ContU_Penalty CHECK (PenaltyTime >= 0)
);
CREATE INDEX IX_ContU_Rank ON dbo.Contest_User (ContestID, TotalScore DESC, PenaltyTime ASC);
CREATE INDEX IX_ContU_User ON dbo.Contest_User (UserID);

CREATE TABLE dbo.Documents (
    DocumentID    INT IDENTITY(1,1) CONSTRAINT PK_Documents PRIMARY KEY,
    ClassID       INT NOT NULL CONSTRAINT FK_Documents_Class REFERENCES dbo.Classes(ClassID) ON DELETE CASCADE,
    FileName      NVARCHAR(255) NOT NULL,
    CloudinaryURL VARCHAR(2048) NOT NULL,
    Category      NVARCHAR(50) NULL,
    UploadDate    DATETIME2(0) NOT NULL CONSTRAINT DF_Documents_Upload DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Documents_Class ON dbo.Documents (ClassID);

CREATE TABLE dbo.Submissions (
    SubmissionID INT IDENTITY(1,1) CONSTRAINT PK_Submissions PRIMARY KEY,
    UserID       INT NOT NULL CONSTRAINT FK_Sub_User REFERENCES dbo.Users(UserID),
    ProblemID    INT NOT NULL CONSTRAINT FK_Sub_Problem REFERENCES dbo.Problems(ProblemID),
    ContestID    INT NULL CONSTRAINT FK_Sub_Contest REFERENCES dbo.Contests(ContestID),
    SourceCode   NVARCHAR(MAX) NOT NULL,
    Language     VARCHAR(20) NOT NULL,
    SubmitTime   DATETIME2(0) NOT NULL CONSTRAINT DF_Sub_Time DEFAULT SYSUTCDATETIME(),
    Result       VARCHAR(20) NOT NULL CONSTRAINT DF_Sub_Result DEFAULT 'Pending',
    Runtime      INT NULL,
    Memory       FLOAT NULL,
    PassedCases  VARCHAR(50) NULL,
    JudgedAt     DATETIME2(0) NULL,
    ClaimedBy    VARCHAR(100) NULL,
    ClaimedAt    DATETIME2(0) NULL,
    CONSTRAINT CK_Sub_Language CHECK (Language IN ('cpp','java','python','csharp')),
    CONSTRAINT CK_Sub_Result CHECK (Result IN ('Pending','Judging','AC','WA','TLE','MLE','RE','CE','IE')),
    CONSTRAINT CK_Sub_Runtime CHECK (Runtime IS NULL OR Runtime >= 0)
);
CREATE INDEX IX_Sub_UserProblem ON dbo.Submissions (UserID, ProblemID, SubmitTime DESC) INCLUDE (Result, Runtime, Memory);
CREATE INDEX IX_Sub_Problem ON dbo.Submissions (ProblemID, Result);
CREATE INDEX IX_Sub_Contest ON dbo.Submissions (ContestID, UserID, ProblemID, SubmitTime) WHERE ContestID IS NOT NULL;
CREATE INDEX IX_Sub_Queue ON dbo.Submissions (SubmissionID) WHERE Result = 'Pending';

CREATE TABLE dbo.SubmissionResults (
    SubmissionID INT NOT NULL CONSTRAINT FK_SR_Sub REFERENCES dbo.Submissions(SubmissionID) ON DELETE CASCADE,
    TestCaseID   INT NOT NULL CONSTRAINT FK_SR_Test REFERENCES dbo.Testcases(TestCaseID) ON DELETE CASCADE,
    Verdict      VARCHAR(20) NOT NULL,
    Runtime      INT NULL,
    Memory       FLOAT NULL,
    CONSTRAINT PK_SubmissionResults PRIMARY KEY (SubmissionID, TestCaseID),
    CONSTRAINT CK_SR_Verdict CHECK (Verdict IN ('AC','WA','TLE','MLE','RE','CE','IE'))
);

CREATE TABLE dbo.ContestProblemResults (
    ContestID   INT NOT NULL,
    UserID      INT NOT NULL,
    ProblemID   INT NOT NULL,
    WrongCount  INT NOT NULL CONSTRAINT DF_CPR_Wrong DEFAULT 0,
    Solved      BIT NOT NULL CONSTRAINT DF_CPR_Solved DEFAULT 0,
    SolveMinute INT NULL,
    CONSTRAINT PK_ContestProblemResults PRIMARY KEY (ContestID, UserID, ProblemID),
    CONSTRAINT FK_CPR_ContU FOREIGN KEY (ContestID, UserID) REFERENCES dbo.Contest_User(ContestID, UserID) ON DELETE CASCADE,
    CONSTRAINT FK_CPR_ContP FOREIGN KEY (ContestID, ProblemID) REFERENCES dbo.Contest_Problem(ContestID, ProblemID),
    CONSTRAINT CK_CPR_Wrong CHECK (WrongCount >= 0)
);

CREATE TABLE dbo.Comments (
    CommentID  INT IDENTITY(1,1) CONSTRAINT PK_Comments PRIMARY KEY,
    UserID     INT NOT NULL CONSTRAINT FK_Comments_User REFERENCES dbo.Users(UserID),
    ProblemID  INT NULL CONSTRAINT FK_Comments_Problem REFERENCES dbo.Problems(ProblemID),
    ContestID  INT NULL CONSTRAINT FK_Comments_Contest REFERENCES dbo.Contests(ContestID),
    ParentID   INT NULL CONSTRAINT FK_Comments_Parent REFERENCES dbo.Comments(CommentID),
    Content    NVARCHAR(MAX) NOT NULL,
    Likes      INT NOT NULL CONSTRAINT DF_Comments_Likes DEFAULT 0,
    IsHidden   BIT NOT NULL CONSTRAINT DF_Comments_Hidden DEFAULT 0,
    [Timestamp] DATETIME2(0) NOT NULL CONSTRAINT DF_Comments_Time DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Comments_Target CHECK ((ProblemID IS NULL AND ContestID IS NOT NULL) OR (ProblemID IS NOT NULL AND ContestID IS NULL)),
    CONSTRAINT CK_Comments_Likes CHECK (Likes >= 0)
);
CREATE INDEX IX_Comments_Problem ON dbo.Comments (ProblemID, [Timestamp]) WHERE ProblemID IS NOT NULL;
CREATE INDEX IX_Comments_Contest ON dbo.Comments (ContestID, [Timestamp]) WHERE ContestID IS NOT NULL;
CREATE INDEX IX_Comments_Parent ON dbo.Comments (ParentID) WHERE ParentID IS NOT NULL;

CREATE TABLE dbo.CommentLikes (
    CommentID INT NOT NULL CONSTRAINT FK_CL_Comment REFERENCES dbo.Comments(CommentID) ON DELETE CASCADE,
    UserID    INT NOT NULL CONSTRAINT FK_CL_User REFERENCES dbo.Users(UserID),
    CONSTRAINT PK_CommentLikes PRIMARY KEY (CommentID, UserID)
);

CREATE TABLE dbo.CommentReports (
    CommentReportID INT IDENTITY(1,1) CONSTRAINT PK_CommentReports PRIMARY KEY,
    CommentID  INT NOT NULL CONSTRAINT FK_CR_Comment REFERENCES dbo.Comments(CommentID) ON DELETE CASCADE,
    ReporterID INT NOT NULL CONSTRAINT FK_CR_Reporter REFERENCES dbo.Users(UserID),
    Reason     NVARCHAR(500) NOT NULL,
    Status     VARCHAR(20) NOT NULL CONSTRAINT DF_CR_Status DEFAULT 'Pending',
    CreatedAt  DATETIME2(0) NOT NULL CONSTRAINT DF_CR_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_CR_Status CHECK (Status IN ('Pending','Hidden','Dismissed'))
);
CREATE UNIQUE INDEX UX_CR_OncePerReporter ON dbo.CommentReports (CommentID, ReporterID);
CREATE INDEX IX_CR_Status ON dbo.CommentReports (Status, CreatedAt);

CREATE TABLE dbo.Reports (
    ReportID     INT IDENTITY(1,1) CONSTRAINT PK_Reports PRIMARY KEY,
    SubmissionID INT NOT NULL CONSTRAINT FK_Reports_Sub REFERENCES dbo.Submissions(SubmissionID),
    TeacherID    INT NULL CONSTRAINT FK_Reports_Teacher REFERENCES dbo.Users(UserID),
    Reason       NVARCHAR(MAX) NOT NULL,
    Status       VARCHAR(50) NOT NULL CONSTRAINT DF_Reports_Status DEFAULT 'Pending',
    CreatedAt    DATETIME2(0) NOT NULL CONSTRAINT DF_Reports_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Reports_Status CHECK (Status IN ('Pending','Reviewed','Rejected'))
);
CREATE UNIQUE INDEX UX_Reports_OpenPerSubmission ON dbo.Reports (SubmissionID) WHERE Status = 'Pending';
CREATE INDEX IX_Reports_Status ON dbo.Reports (Status, CreatedAt);

CREATE TABLE dbo.Notifications (
    NotificationID INT IDENTITY(1,1) CONSTRAINT PK_Notifications PRIMARY KEY,
    UserID    INT NOT NULL CONSTRAINT FK_Notif_User REFERENCES dbo.Users(UserID) ON DELETE CASCADE,
    Title     NVARCHAR(200) NOT NULL,
    Body      NVARCHAR(500) NULL,
    Link      VARCHAR(255) NULL,
    IsRead    BIT NOT NULL CONSTRAINT DF_Notif_Read DEFAULT 0,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Notif_CreatedAt DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Notif_User ON dbo.Notifications (UserID, IsRead, CreatedAt DESC);

CREATE TABLE dbo.JudgeWorkers (
    WorkerID    VARCHAR(100) NOT NULL CONSTRAINT PK_JudgeWorkers PRIMARY KEY,
    StartedAt   DATETIME2(0) NOT NULL,
    LastSeenAt  DATETIME2(0) NOT NULL,
    JudgedCount INT NOT NULL CONSTRAINT DF_JW_Count DEFAULT 0
);

CREATE TABLE dbo.AuditLog (
    AuditID    BIGINT IDENTITY(1,1) CONSTRAINT PK_AuditLog PRIMARY KEY,
    ActorID    INT NULL,
    Action     VARCHAR(50) NOT NULL,
    TargetType VARCHAR(30) NOT NULL,
    TargetID   INT NULL,
    Detail     NVARCHAR(500) NULL,
    CreatedAt  DATETIME2(0) NOT NULL CONSTRAINT DF_Audit_CreatedAt DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Audit_Time ON dbo.AuditLog (CreatedAt DESC);
GO

CREATE ROLE app_executor;
GRANT EXECUTE ON SCHEMA::app TO app_executor;
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO app_executor;
GO
