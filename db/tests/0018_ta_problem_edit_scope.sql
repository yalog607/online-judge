DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @TeacherID INT, @TAID INT, @ClassID INT, @OtherClassID INT, @ProblemID INT;
DECLARE @Created TABLE (ProblemID INT);
DECLARE @Suffix VARCHAR(12) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 12);

INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES
 ('scope_teacher_' + @Suffix, 'hash', 'scope_t_' + @Suffix + '@test.com', N'Scope Teacher', 'Teacher'),
 ('scope_ta_' + @Suffix, 'hash', 'scope_ta_' + @Suffix + '@test.com', N'Scope TA', 'TA');
SELECT @TeacherID = MAX(CASE WHEN Username = 'scope_teacher_' + @Suffix THEN UserID END),
       @TAID = MAX(CASE WHEN Username = 'scope_ta_' + @Suffix THEN UserID END)
FROM dbo.Users;

INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@TeacherID, 'S1' + LEFT(@Suffix, 8), N'Scope assigned class', 1, 'Approved');
SET @ClassID = SCOPE_IDENTITY();
INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@TeacherID, 'S2' + RIGHT(@Suffix, 8), N'Scope other class', 1, 'Approved');
SET @OtherClassID = SCOPE_IDENTITY();
INSERT dbo.Class_TA (ClassID, UserID_TA) VALUES (@ClassID, @TAID), (@OtherClassID, @TAID);

INSERT @Created EXEC app.usp_Problem_Create
    @CreatorID = @TAID, @Title = N'Scope base title', @Statement = N'Scope base statement',
    @InputFormat = N'one integer', @OutputFormat = N'one integer', @TimeLimit = 1000, @MemoryLimit = 256,
    @Tags = N'base', @Difficulty = 'Easy', @Status = 'Pending', @ClassID = @ClassID, @ProposedStatus = 'Public';
SELECT @ProblemID = ProblemID FROM @Created;
EXEC app.usp_Testcase_ReplaceAll @ProblemID, @TAID, N'[{"input":"1","expectedOutput":"1","isHidden":false}]';
EXEC app.usp_Problem_SetStatus @ProblemID, @TeacherID, 'Public';

-- Metadata only: the hidden Pending value from the TA form must not demote approval.
EXEC app.usp_Problem_Update @ProblemID, @TAID, N'Scope base title', N'Scope base statement',
    N'one integer', N'one integer', 1000, 256, N'base,tagged', 'Medium', 'Pending', NULL, NULL, 'Private';
INSERT @Results VALUES ('Tags and difficulty preserve approved status', CASE WHEN EXISTS (
    SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND Status = 'Public' AND Tags = N'base,tagged' AND Difficulty = 'Medium'
) THEN 1 ELSE 0 END);

-- Each content/configuration field independently requires review.
EXEC app.usp_Problem_Update @ProblemID, @TAID, N'Scope changed title', N'Scope base statement', N'one integer', N'one integer', 1000, 256, N'base,tagged', 'Medium', 'Pending', NULL, NULL, 'Private';
INSERT @Results VALUES ('Title change requires review', CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID=@ProblemID AND Status='Pending' AND ProposedStatus='Private') THEN 1 ELSE 0 END);
EXEC app.usp_Problem_SetStatus @ProblemID, @TeacherID, 'Public';
EXEC app.usp_Problem_Update @ProblemID, @TAID, N'Scope changed title', N'Scope changed statement', N'one integer', N'one integer', 1000, 256, N'base,tagged', 'Medium', 'Pending', NULL, NULL, 'Public';
INSERT @Results VALUES ('Statement change requires review', CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID=@ProblemID AND Status='Pending') THEN 1 ELSE 0 END);
EXEC app.usp_Problem_SetStatus @ProblemID, @TeacherID, 'Public';
EXEC app.usp_Problem_Update @ProblemID, @TAID, N'Scope changed title', N'Scope changed statement', N'two integers', N'one integer', 1000, 256, N'base,tagged', 'Medium', 'Pending', NULL, NULL, 'Public';
INSERT @Results VALUES ('Input format change requires review', CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID=@ProblemID AND Status='Pending') THEN 1 ELSE 0 END);
EXEC app.usp_Problem_SetStatus @ProblemID, @TeacherID, 'Public';
EXEC app.usp_Problem_Update @ProblemID, @TAID, N'Scope changed title', N'Scope changed statement', N'two integers', N'two integers', 1000, 256, N'base,tagged', 'Medium', 'Pending', NULL, NULL, 'Public';
INSERT @Results VALUES ('Output format change requires review', CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID=@ProblemID AND Status='Pending') THEN 1 ELSE 0 END);
EXEC app.usp_Problem_SetStatus @ProblemID, @TeacherID, 'Public';
EXEC app.usp_Problem_Update @ProblemID, @TAID, N'Scope changed title', N'Scope changed statement', N'two integers', N'two integers', 2000, 256, N'base,tagged', 'Medium', 'Pending', NULL, NULL, 'Public';
INSERT @Results VALUES ('Time limit change requires review', CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID=@ProblemID AND Status='Pending') THEN 1 ELSE 0 END);
EXEC app.usp_Problem_SetStatus @ProblemID, @TeacherID, 'Public';
EXEC app.usp_Problem_Update @ProblemID, @TAID, N'Scope changed title', N'Scope changed statement', N'two integers', N'two integers', 2000, 512, N'base,tagged', 'Medium', 'Pending', NULL, NULL, 'Public';
INSERT @Results VALUES ('Memory limit change requires review', CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID=@ProblemID AND Status='Pending') THEN 1 ELSE 0 END);
EXEC app.usp_Problem_SetStatus @ProblemID, @TeacherID, 'Public';
EXEC app.usp_Problem_Update @ProblemID, @TAID, N'Scope changed title', N'Scope changed statement', N'two integers', N'two integers', 2000, 512, N'base,tagged', 'Medium', 'Pending', 'function', N'{"name":"solve","params":[],"returns":"int"}', 'Public';
INSERT @Results VALUES ('Judge mode and function configuration require review', CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID=@ProblemID AND Status='Pending') THEN 1 ELSE 0 END);

-- Pending and rejected edits remain pending and keep the TA visibility proposal.
EXEC app.usp_Problem_Update @ProblemID, @TAID, N'Scope changed title', N'Scope changed statement', N'two integers', N'two integers', 2000, 512, N'base,tagged', 'Medium', 'Pending', 'function', N'{"name":"solve","params":[],"returns":"int"}', 'Private';
EXEC app.usp_Problem_SetStatus @ProblemID, @TeacherID, 'Rejected', N'Needs changes';
EXEC app.usp_Problem_Update @ProblemID, @TAID, N'Resubmitted title', N'Scope changed statement', N'two integers', N'two integers', 2000, 512, N'base,tagged', 'Medium', 'Pending', 'function', N'{"name":"solve","params":[],"returns":"int"}', 'Public';
INSERT @Results VALUES ('Rejected TA edit returns to pending and updates proposal', CASE WHEN EXISTS (
    SELECT 1 FROM dbo.Problems WHERE ProblemID=@ProblemID AND Status='Pending' AND ProposedStatus='Public' AND RejectionReason IS NULL AND Title=N'Resubmitted title'
) THEN 1 ELSE 0 END);
EXEC app.usp_Problem_SetStatus @ProblemID, @TeacherID, 'Private';
INSERT @Results VALUES ('Teacher approval applies selected status and clears proposal', CASE WHEN EXISTS (
    SELECT 1 FROM dbo.Problems WHERE ProblemID=@ProblemID AND Status='Private' AND ProposedStatus IS NULL
) THEN 1 ELSE 0 END);

-- Keep the TA account's role and an unrelated class assignment, but revoke assignment to the class containing the problem.
DELETE dbo.Class_TA WHERE ClassID=@ClassID AND UserID_TA=@TAID;
DECLARE @Permission TABLE (CanEdit BIT);
INSERT @Permission EXEC app.usp_Problem_CanTAEdit @ProblemID, @TAID;
INSERT @Results VALUES ('CanTAEdit is false when TA lost the assignment for the linked class', CASE WHEN EXISTS (
    SELECT 1 FROM @Permission WHERE CanEdit = 0
) THEN 1 ELSE 0 END);

BEGIN TRY
    EXEC app.usp_Problem_Update @ProblemID, @TAID, N'Unauthorized', N'Unauthorized', N'x', N'y', 1000, 256, NULL, 'Easy', 'Pending';
    INSERT @Results VALUES ('TA cannot update after losing assignment to problem class', 0);
END TRY BEGIN CATCH INSERT @Results VALUES ('TA cannot update after losing assignment to problem class', 1); END CATCH;
BEGIN TRY
    EXEC app.usp_Testcase_ListForOwner @ProblemID, @TAID;
    INSERT @Results VALUES ('TA cannot read testcases after losing assignment to problem class', 0);
END TRY BEGIN CATCH INSERT @Results VALUES ('TA cannot read testcases after losing assignment to problem class', 1); END CATCH;
BEGIN TRY
    EXEC app.usp_Testcase_ReplaceAll @ProblemID, @TAID, N'[]';
    INSERT @Results VALUES ('TA cannot replace testcases after losing assignment to problem class', 0);
END TRY BEGIN CATCH INSERT @Results VALUES ('TA cannot replace testcases after losing assignment to problem class', 1); END CATCH;

-- An assignment to a cancelled linked class also does not grant edit access.
INSERT dbo.Class_TA (ClassID, UserID_TA) VALUES (@ClassID, @TAID);
UPDATE dbo.Classes SET IsCancelled = 1 WHERE ClassID = @ClassID;
DELETE FROM @Permission;
INSERT @Permission EXEC app.usp_Problem_CanTAEdit @ProblemID, @TAID;
INSERT @Results VALUES ('CanTAEdit is false for a cancelled linked class', CASE WHEN EXISTS (
    SELECT 1 FROM @Permission WHERE CanEdit = 0
) THEN 1 ELSE 0 END);
BEGIN TRY
    EXEC app.usp_Problem_Update @ProblemID, @TAID, N'Unauthorized', N'Unauthorized', N'x', N'y', 1000, 256, NULL, 'Easy', 'Pending';
    INSERT @Results VALUES ('TA cannot update a problem linked only to a cancelled assigned class', 0);
END TRY BEGIN CATCH INSERT @Results VALUES ('TA cannot update a problem linked only to a cancelled assigned class', 1); END CATCH;

-- A teacher who owns an attached class retains management access.
BEGIN TRY
    EXEC app.usp_Problem_Update @ProblemID, @TeacherID, N'Teacher title', N'Teacher statement', N'x', N'y', 1000, 256, NULL, 'Easy', 'Private';
    INSERT @Results VALUES ('Teacher retains update access', 1);
    EXEC app.usp_Testcase_ListForOwner @ProblemID, @TeacherID;
    INSERT @Results VALUES ('Teacher retains testcase read access', 1);
    EXEC app.usp_Testcase_ReplaceAll @ProblemID, @TeacherID, N'[]';
    INSERT @Results VALUES ('Teacher retains testcase write access', 1);
END TRY BEGIN CATCH
    INSERT @Results VALUES ('Teacher retains update access', 0);
    INSERT @Results VALUES ('Teacher retains testcase read access', 0);
    INSERT @Results VALUES ('Teacher retains testcase write access', 0);
END CATCH;

DELETE dbo.Testcases WHERE ProblemID=@ProblemID;
DELETE dbo.Class_Problem WHERE ProblemID=@ProblemID;
DELETE dbo.Problems WHERE ProblemID=@ProblemID;
DELETE dbo.Class_TA WHERE ClassID IN (@ClassID, @OtherClassID);
DELETE dbo.Classes WHERE ClassID IN (@ClassID, @OtherClassID);
DELETE dbo.Users WHERE UserID IN (@TeacherID, @TAID);

SELECT Assertion, Passed FROM @Results;
