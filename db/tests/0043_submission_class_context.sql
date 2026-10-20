DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
BEGIN TRANSACTION;
DECLARE @Sfx VARCHAR(8) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @TeacherID INT, @StudentID INT, @ClassA INT, @ClassB INT, @ProblemID INT;
DECLARE @S1 TABLE (SubmissionID INT);
DECLARE @S2 TABLE (SubmissionID INT);
DECLARE @S3 TABLE (SubmissionID INT);
DECLARE @Hist TABLE (SubmissionID INT, UserID INT, Username NVARCHAR(100), FullName NVARCHAR(200), ProblemID INT,
                     ProblemTitle NVARCHAR(200), Language VARCHAR(20), Result VARCHAR(20), Runtime INT NULL,
                     Memory FLOAT NULL, SubmitTime DATETIME2(0), TotalCount INT);

INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('cc_t_' + @Sfx, 'hash', 'cc_t_' + @Sfx + '@test.com', N'CC Teacher', 'Teacher');
SET @TeacherID = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('cc_s_' + @Sfx, 'hash', 'cc_s_' + @Sfx + '@test.com', N'CC Student', 'User');
SET @StudentID = SCOPE_IDENTITY();
INSERT dbo.Problems (CreatorID, Title, Statement, Difficulty, Status) VALUES (@TeacherID, N'CC Problem ' + @Sfx, N'T', 'Easy', 'Public');
SET @ProblemID = SCOPE_IDENTITY();
INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus) VALUES (@TeacherID, 'CA' + @Sfx, N'CC A', 1, 'Approved');
SET @ClassA = SCOPE_IDENTITY();
INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus) VALUES (@TeacherID, 'CB' + @Sfx, N'CC B', 1, 'Approved');
SET @ClassB = SCOPE_IDENTITY();
INSERT dbo.Class_Student (ClassID, UserID, JoinDate, ProgressPercent) VALUES (@ClassA, @StudentID, SYSUTCDATETIME(), 0), (@ClassB, @StudentID, SYSUTCDATETIME(), 0);
INSERT dbo.Class_Problem (ClassID, ProblemID, AssignedDate, IsClosed) VALUES (@ClassA, @ProblemID, SYSUTCDATETIME(), 0);

INSERT @S1 EXEC app.usp_Submission_Create @UserID = @StudentID, @ProblemID = @ProblemID, @SourceCode = 'x', @Language = 'python', @ClassID = @ClassA;
INSERT @S2 EXEC app.usp_Submission_Create @UserID = @StudentID, @ProblemID = @ProblemID, @SourceCode = 'x', @Language = 'python', @ClassID = @ClassB;
INSERT @S3 EXEC app.usp_Submission_Create @UserID = @StudentID, @ProblemID = @ProblemID, @SourceCode = 'x', @Language = 'python';

INSERT @Results VALUES ('Submission made from the class that has the problem is tagged with that class',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Submissions s JOIN @S1 x ON x.SubmissionID = s.SubmissionID WHERE s.ClassID = @ClassA) THEN 1 ELSE 0 END);
INSERT @Results VALUES ('Class context is dropped when the class does not have the problem',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Submissions s JOIN @S2 x ON x.SubmissionID = s.SubmissionID WHERE s.ClassID IS NULL) THEN 1 ELSE 0 END);
INSERT @Results VALUES ('Submission from the public problem list is not tied to any class',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Submissions s JOIN @S3 x ON x.SubmissionID = s.SubmissionID WHERE s.ClassID IS NULL) THEN 1 ELSE 0 END);

INSERT @Hist EXEC app.usp_Class_GetSubmissions @ClassID = @ClassA, @ActorID = @TeacherID;
INSERT @Results VALUES ('Class A history only lists the submission made inside class A',
    CASE WHEN (SELECT COUNT(*) FROM @Hist) = 1 AND EXISTS (SELECT 1 FROM @Hist h JOIN @S1 x ON x.SubmissionID = h.SubmissionID) THEN 1 ELSE 0 END);
DELETE FROM @Hist;
INSERT @Hist EXEC app.usp_Class_GetSubmissions @ClassID = @ClassB, @ActorID = @TeacherID;
INSERT @Results VALUES ('Class B history stays empty',
    CASE WHEN (SELECT COUNT(*) FROM @Hist) = 0 THEN 1 ELSE 0 END);

ROLLBACK TRANSACTION;
SELECT Assertion, Passed FROM @Results;
