DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

DECLARE @OwnerID INT, @TAID INT, @OtherTAID INT, @ClassID INT, @DocumentID INT;
INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES
 ('tadoc_owner_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8), 'hash', 'tadoco_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8) + '@test.com', N'Document Owner', 'Teacher'),
 ('tadoc_ta_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8), 'hash', 'tadoct_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8) + '@test.com', N'Document TA', 'TA'),
 ('tadoc_other_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8), 'hash', 'tadocx_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8) + '@test.com', N'Other TA', 'TA');
SELECT @OwnerID = MAX(CASE WHEN FullName = N'Document Owner' THEN UserID END),
       @TAID = MAX(CASE WHEN FullName = N'Document TA' THEN UserID END),
       @OtherTAID = MAX(CASE WHEN FullName = N'Other TA' THEN UserID END)
FROM dbo.Users;

INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@OwnerID, 'TD' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 10), N'TA Document Permission Class', 1, 'Approved');
SET @ClassID = SCOPE_IDENTITY();
INSERT dbo.Class_TA (ClassID, UserID_TA) VALUES (@ClassID, @TAID);

EXEC app.usp_Document_Add @ClassID = @ClassID, @UserID = @TAID, @FileName = N'notes.pdf', @CloudinaryURL = 'https://example.test/notes.pdf';
SELECT @DocumentID = MAX(DocumentID) FROM dbo.Documents WHERE ClassID = @ClassID;
INSERT @Results VALUES ('assigned TA can upload class material', CASE WHEN @DocumentID IS NOT NULL THEN 1 ELSE 0 END);

BEGIN TRY
    EXEC app.usp_Document_Delete @DocumentID = @DocumentID, @UserID = @OtherTAID;
    INSERT @Results VALUES ('unassigned TA cannot delete another class material', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('unassigned TA cannot delete another class material', 1);
END CATCH;

EXEC app.usp_Document_Delete @DocumentID = @DocumentID, @UserID = @TAID;
INSERT @Results VALUES ('assigned TA can delete class material', CASE WHEN NOT EXISTS (SELECT 1 FROM dbo.Documents WHERE DocumentID = @DocumentID) THEN 1 ELSE 0 END);

DECLARE @NewProblem TABLE (ProblemID INT);
INSERT @NewProblem
EXEC app.usp_Problem_Create
    @CreatorID = @TAID,
    @Title = N'TA Draft Assignment',
    @Statement = N'This is a test statement for a TA-created class assignment.',
    @InputFormat = NULL,
    @OutputFormat = NULL,
    @TimeLimit = 1000,
    @MemoryLimit = 256,
    @Tags = NULL,
    @Difficulty = 'Easy',
    @Status = 'Public',
    @ClassID = @ClassID;
DECLARE @ProblemID INT = (SELECT TOP (1) ProblemID FROM @NewProblem);
INSERT @Results VALUES ('TA problem creation is pending and linked to assigned class',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND CreatorID = @TAID AND Status = 'Pending')
          AND EXISTS (SELECT 1 FROM dbo.Class_Problem WHERE ClassID = @ClassID AND ProblemID = @ProblemID)
         THEN 1 ELSE 0 END);

BEGIN TRY
    EXEC app.usp_Problem_Create
        @CreatorID = @OtherTAID,
        @Title = N'Unauthorized TA Draft',
        @Statement = N'This test verifies another TA cannot add an exercise to this class.',
        @InputFormat = NULL,
        @OutputFormat = NULL,
        @TimeLimit = 1000,
        @MemoryLimit = 256,
        @Tags = NULL,
        @Difficulty = 'Easy',
        @Status = 'Pending',
        @ClassID = @ClassID;
    INSERT @Results VALUES ('unassigned TA cannot create class assignment', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('unassigned TA cannot create class assignment', 1);
END CATCH;

DELETE FROM dbo.Class_Problem WHERE ClassID = @ClassID;
DELETE FROM dbo.Problems WHERE ProblemID = @ProblemID;
DELETE FROM dbo.Documents WHERE ClassID = @ClassID;
DELETE FROM dbo.Class_TA WHERE ClassID = @ClassID;
DELETE FROM dbo.Classes WHERE ClassID = @ClassID;
DELETE FROM dbo.Users WHERE UserID IN (@OwnerID, @TAID, @OtherTAID);

SELECT Assertion, Passed FROM @Results;
