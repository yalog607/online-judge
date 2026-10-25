DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

BEGIN TRANSACTION;

DECLARE @Sfx VARCHAR(8) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
INSERT INTO dbo.Users (Username, Password, Email, FullName, Role)
VALUES ('code_t_' + @Sfx, 'hash', 'code_t_' + @Sfx + '@test.com', N'Code Teacher', 'Teacher');
DECLARE @TeacherID INT = (SELECT UserID FROM dbo.Users WHERE Username = 'code_t_' + @Sfx);

INSERT INTO dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@TeacherID, 'CD' + @Sfx, N'Code Class ' + @Sfx, 1, 'Approved');
DECLARE @ClassID INT = (SELECT ClassID FROM dbo.Classes WHERE InviteCode = 'CD' + @Sfx);

INSERT INTO dbo.Problems (CreatorID, Title, Statement, Difficulty, Status)
VALUES (@TeacherID, N'Code Problem ' + @Sfx, N'Solve', 'Easy', 'Public');
DECLARE @ProblemID INT = (SELECT ProblemID FROM dbo.Problems WHERE Title = N'Code Problem ' + @Sfx);

INSERT INTO dbo.Contests (CreatorID, ContestName, StartTime, EndTime)
VALUES (@TeacherID, N'Code Contest ' + @Sfx, DATEADD(HOUR, 1, SYSUTCDATETIME()), DATEADD(HOUR, 2, SYSUTCDATETIME()));
DECLARE @ContestID INT = (SELECT ContestID FROM dbo.Contests WHERE ContestName = N'Code Contest ' + @Sfx);

DECLARE @PCode VARCHAR(16) = (SELECT ProblemCode FROM dbo.Problems WHERE ProblemID = @ProblemID);
DECLARE @CCode VARCHAR(16) = (SELECT ContestCode FROM dbo.Contests WHERE ContestID = @ContestID);
DECLARE @LCode VARCHAR(16) = (SELECT ClassCode FROM dbo.Classes WHERE ClassID = @ClassID);

INSERT @Results SELECT 'codes use BT/KT/LH prefixes with at least three digits',
    CASE WHEN @PCode LIKE 'BT[0-9][0-9][0-9]%' AND @CCode LIKE 'KT[0-9][0-9][0-9]%' AND @LCode LIKE 'LH[0-9][0-9][0-9]%' THEN 1 ELSE 0 END;
INSERT @Results SELECT 'code embeds the full id (no truncation)',
    CASE WHEN @PCode LIKE '%' + CAST(@ProblemID AS VARCHAR(10)) AND @LCode LIKE '%' + CAST(@ClassID AS VARCHAR(10)) AND @CCode LIKE '%' + CAST(@ContestID AS VARCHAR(10)) THEN 1 ELSE 0 END;

DECLARE @P TABLE (ProblemID INT, ProblemCode VARCHAR(16), Title NVARCHAR(200), Tags NVARCHAR(200), Difficulty VARCHAR(20), Status VARCHAR(20), ProposedStatus VARCHAR(20),
    CreatedAt DATETIME2(0), CreatorID INT, CreatorFullName NVARCHAR(100), ClassID INT, ClassName NVARCHAR(150), CanManage BIT, TotalCount INT);
INSERT @P EXEC app.usp_Problem_ListForManage @ActorID = @TeacherID, @Search = @PCode, @Page = 1, @PageSize = 20, @OwnerOnly = 1;
INSERT @Results SELECT 'problem list search by code finds the problem',
    CASE WHEN EXISTS (SELECT 1 FROM @P WHERE ProblemID = @ProblemID AND ProblemCode = @PCode) THEN 1 ELSE 0 END;

DECLARE @C TABLE (ContestID INT, ContestCode VARCHAR(16), CreatorID INT, CreatorName NVARCHAR(200), CreatorUsername NVARCHAR(100),
    ContestName NVARCHAR(200), Description NVARCHAR(MAX), StartTime DATETIME2(0), EndTime DATETIME2(0),
    ClassID INT NULL, ClassName NVARCHAR(200) NULL, IsProtected BIT, Status VARCHAR(20),
    ProblemCount INT, ParticipantCount INT, CreatedAt DATETIME2(0), TotalCount INT);
INSERT @C EXEC app.usp_Contest_List @Status = 'All', @Search = @CCode, @Page = 1, @PageSize = 20, @UserID = @TeacherID, @OnlyMine = 1;
INSERT @Results SELECT 'contest list search by code finds the contest',
    CASE WHEN EXISTS (SELECT 1 FROM @C WHERE ContestID = @ContestID AND ContestCode = @CCode) THEN 1 ELSE 0 END;

DECLARE @L TABLE (ClassID INT, TeacherID INT, TeacherName NVARCHAR(100), TeacherEmail VARCHAR(100), ClassCode VARCHAR(16), InviteCode VARCHAR(20),
    ClassName NVARCHAR(150), Description NVARCHAR(MAX), IsPublic BIT, ApprovalStatus VARCHAR(20),
    IsCancelled BIT, RejectionReason NVARCHAR(MAX), CreatedAt DATETIME2(0), StudentCount INT,
    IsJoined BIT, IsTA BIT, TotalCount INT);
INSERT @L EXEC app.usp_Class_List @UserID = @TeacherID, @Search = @LCode, @OnlyMine = 1, @Page = 1, @PageSize = 20;
INSERT @Results SELECT 'class list search by code finds the class',
    CASE WHEN EXISTS (SELECT 1 FROM @L WHERE ClassID = @ClassID AND ClassCode = @LCode) THEN 1 ELSE 0 END;

IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
SELECT Assertion, Passed FROM @Results;
