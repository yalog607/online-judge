DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

BEGIN TRANSACTION;

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role)
VALUES
    ('pmf_owner_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8), 'hash', 'pmfo_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8) + '@test.com', N'Problem Filter Owner', 'Teacher'),
    ('pmf_other_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8), 'hash', 'pmfx_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8) + '@test.com', N'Problem Filter Other', 'Teacher');

DECLARE @OwnerID INT = (SELECT TOP (1) UserID FROM dbo.Users WHERE FullName = N'Problem Filter Owner' ORDER BY UserID DESC);
DECLARE @OtherID INT = (SELECT TOP (1) UserID FROM dbo.Users WHERE FullName = N'Problem Filter Other' ORDER BY UserID DESC);

INSERT INTO dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES
    (@OwnerID, 'PMF1' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 6), N'Filter Class One', 1, 'Approved'),
    (@OwnerID, 'PMF2' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 6), N'Filter Class Two', 1, 'Approved');
DECLARE @Class1 INT = (SELECT MIN(ClassID) FROM dbo.Classes WHERE ClassName = N'Filter Class One');
DECLARE @Class2 INT = (SELECT MIN(ClassID) FROM dbo.Classes WHERE ClassName = N'Filter Class Two');

INSERT INTO dbo.Problems (CreatorID, Title, Statement, Tags, Difficulty, Status)
VALUES (@OwnerID, N'OwnedFilterTarget', N'Solve it', N'plan,alpha', 'Easy', 'Public'),
       (@OtherID, N'OwnedFilterTarget', N'Solve it', N'plan,alpha', 'Easy', 'Public');
DECLARE @OwnedProblem INT = (SELECT MAX(ProblemID) FROM dbo.Problems WHERE CreatorID = @OwnerID AND Title = N'OwnedFilterTarget');
DECLARE @OtherProblem INT = (SELECT MAX(ProblemID) FROM dbo.Problems WHERE CreatorID = @OtherID AND Title = N'OwnedFilterTarget');
INSERT INTO dbo.Class_Problem (ClassID, ProblemID) VALUES (@Class1, @OwnedProblem), (@Class2, @OwnedProblem);

DECLARE @Rows TABLE (
    ProblemID INT, ProblemCode VARCHAR(16), Title NVARCHAR(200), Tags NVARCHAR(200), Difficulty VARCHAR(20), Status VARCHAR(20), ProposedStatus VARCHAR(20),
    CreatedAt DATETIME2(0), CreatorID INT, CreatorFullName NVARCHAR(100), ClassID INT,
    ClassName NVARCHAR(150), CanManage BIT, TotalCount INT
);
INSERT INTO @Rows
EXEC app.usp_Problem_ListForManage
    @ActorID = @OwnerID,
    @Search = N'OwnedFilterTarget',
    @Tag = 'alpha',
    @Difficulty = 'Easy',
    @Status = 'Public',
    @Page = 1,
    @PageSize = 20,
    @OwnerOnly = 1;

INSERT @Results SELECT 'owner-only filter applies together with other filters',
    CASE WHEN (SELECT COUNT(*) FROM @Rows) = 1 AND EXISTS (SELECT 1 FROM @Rows WHERE ProblemID = @OwnedProblem AND CreatorID = @OwnerID) THEN 1 ELSE 0 END;
INSERT @Results SELECT 'problem assigned to several classes appears once',
    CASE WHEN (SELECT COUNT(*) FROM @Rows WHERE ProblemID = @OwnedProblem) = 1 AND (SELECT MAX(TotalCount) FROM @Rows) = 1 THEN 1 ELSE 0 END;
INSERT @Results SELECT 'another creator is excluded from owner-only results',
    CASE WHEN NOT EXISTS (SELECT 1 FROM @Rows WHERE ProblemID = @OtherProblem) THEN 1 ELSE 0 END;

IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
SELECT Assertion, Passed FROM @Results;
