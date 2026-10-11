DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @TeacherID INT, @TAID INT, @ClassID INT, @ProblemID INT;
DECLARE @Created TABLE (ProblemID INT);

INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES
 ('proposal_teacher_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8), 'hash', 'proposal_t_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8) + '@test.com', N'Proposal Teacher', 'Teacher'),
 ('proposal_ta_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8), 'hash', 'proposal_ta_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8) + '@test.com', N'Proposal TA', 'TA');

SELECT @TeacherID = MAX(CASE WHEN FullName = N'Proposal Teacher' THEN UserID END),
       @TAID = MAX(CASE WHEN FullName = N'Proposal TA' THEN UserID END)
FROM dbo.Users;

INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@TeacherID, 'PS' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 10), N'Proposal Status Test', 1, 'Approved');
SET @ClassID = SCOPE_IDENTITY();
INSERT dbo.Class_TA (ClassID, UserID_TA) VALUES (@ClassID, @TAID);

INSERT @Created
EXEC app.usp_Problem_Create
    @CreatorID = @TAID, @Title = N'Proposed Public Problem', @Statement = N'Problem statement for proposal testing',
    @InputFormat = NULL, @OutputFormat = NULL, @TimeLimit = 1000, @MemoryLimit = 256,
    @Tags = NULL, @Difficulty = 'Easy', @Status = 'Pending', @ClassID = @ClassID,
    @ProposedStatus = 'Public';
SELECT @ProblemID = ProblemID FROM @Created;

INSERT @Results VALUES ('TA proposal is stored while effective status remains Pending',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND Status = 'Pending' AND ProposedStatus = 'Public') THEN 1 ELSE 0 END);

BEGIN TRY
    EXEC app.usp_Problem_SetStatus @ProblemID = @ProblemID, @ActorID = @TAID, @Status = 'Public';
    INSERT @Results VALUES ('TA cannot publish a problem without teacher approval', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('TA cannot publish a problem without teacher approval',
        CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND Status = 'Pending' AND ProposedStatus = 'Public') THEN 1 ELSE 0 END);
END CATCH;

EXEC app.usp_Problem_Update
    @ProblemID = @ProblemID, @ActorID = @TAID, @Title = N'Proposed Private Problem',
    @Statement = N'Updated problem statement for proposal testing', @InputFormat = NULL, @OutputFormat = NULL,
    @TimeLimit = 1000, @MemoryLimit = 256, @Tags = NULL, @Difficulty = 'Easy',
    @Status = 'Pending', @ProposedStatus = 'Private';
INSERT @Results VALUES ('TA can change proposal while editing pending problem',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND Status = 'Pending' AND ProposedStatus = 'Private') THEN 1 ELSE 0 END);

EXEC app.usp_Problem_SetStatus @ProblemID = @ProblemID, @ActorID = @TeacherID, @Status = 'Public';
INSERT @Results VALUES ('Teacher can choose a different approved status and proposal is cleared',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND Status = 'Public' AND ProposedStatus IS NULL) THEN 1 ELSE 0 END);

EXEC app.usp_Problem_Update
    @ProblemID = @ProblemID, @ActorID = @TAID, @Title = N'Proposed Private Problem',
    @Statement = N'Updated problem statement for proposal testing', @InputFormat = NULL, @OutputFormat = NULL,
    @TimeLimit = 1000, @MemoryLimit = 256, @Tags = NULL, @Difficulty = 'Easy',
    @Status = 'Pending', @ProposedStatus = 'Private', @NeedsReview = 1;
INSERT @Results VALUES ('TA major edit records its requested status for review',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND Status = 'Pending' AND ProposedStatus = 'Private') THEN 1 ELSE 0 END);

EXEC app.usp_Problem_SetStatus @ProblemID = @ProblemID, @ActorID = @TeacherID, @Status = 'Private';
INSERT @Results VALUES ('Teacher approval clears the proposal after a major edit',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND Status = 'Private' AND ProposedStatus IS NULL) THEN 1 ELSE 0 END);

DELETE FROM dbo.Testcases WHERE ProblemID = @ProblemID;
DELETE FROM dbo.Class_Problem WHERE ProblemID = @ProblemID;
DELETE FROM dbo.Problems WHERE ProblemID = @ProblemID;
DELETE FROM dbo.Class_TA WHERE ClassID = @ClassID;
DELETE FROM dbo.Classes WHERE ClassID = @ClassID;
DELETE FROM dbo.Users WHERE UserID IN (@TeacherID, @TAID);

SELECT Assertion, Passed FROM @Results;
