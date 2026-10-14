DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

BEGIN TRANSACTION;

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role)
VALUES
    ('tcv_owner_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'tcvo_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'Class Owner', 'Teacher'),
    ('tcv_viewer_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'tcvv_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'Class Viewer', 'Teacher'),
    ('tcv_admin_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'tcva_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'Class Admin', 'Admin');

DECLARE @OwnerID INT = (SELECT UserID FROM dbo.Users WHERE FullName = N'Class Owner' AND Email LIKE 'tcvo_%@test.com');
DECLARE @ViewerID INT = (SELECT UserID FROM dbo.Users WHERE FullName = N'Class Viewer' AND Email LIKE 'tcvv_%@test.com');
DECLARE @AdminID INT = (SELECT UserID FROM dbo.Users WHERE FullName = N'Class Admin' AND Email LIKE 'tcva_%@test.com');

INSERT INTO dbo.Classes (TeacherID, InviteCode, ClassName, Description, IsPublic, ApprovalStatus)
VALUES
    (@OwnerID, 'TCVP' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 6), N'Public Preview Class', N'Public description', 1, 'Approved'),
    (@OwnerID, 'TCVR' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 6), N'Private Preview Class', N'Private description', 0, 'Approved'),
    (@OwnerID, 'TCVU' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 6), N'Unapproved Preview Class', N'Pending description', 1, 'Pending');

DECLARE @PublicClassID INT = (SELECT ClassID FROM dbo.Classes WHERE ClassName = N'Public Preview Class');
DECLARE @PrivateClassID INT = (SELECT ClassID FROM dbo.Classes WHERE ClassName = N'Private Preview Class');
DECLARE @PendingClassID INT = (SELECT ClassID FROM dbo.Classes WHERE ClassName = N'Unapproved Preview Class');

DECLARE @PublicProblemID INT;
DECLARE @PrivateProblemID INT;
INSERT INTO dbo.Problems (CreatorID, Title, Statement, Difficulty, Status)
VALUES (@OwnerID, N'Preview Public Problem', N'Solve it', 'Easy', 'Public'),
       (@OwnerID, N'Preview Private Problem', N'Solve it', 'Easy', 'Private');
SELECT @PublicProblemID = MIN(ProblemID) FROM dbo.Problems WHERE Title = N'Preview Public Problem';
SELECT @PrivateProblemID = MIN(ProblemID) FROM dbo.Problems WHERE Title = N'Preview Private Problem';

INSERT INTO dbo.Class_Problem (ClassID, ProblemID)
VALUES (@PublicClassID, @PublicProblemID), (@PublicClassID, @PrivateProblemID);

DECLARE @PublicView TABLE (
    ClassID INT,
    TeacherID INT,
    TeacherName NVARCHAR(100),
    InviteCode VARCHAR(20),
    ClassName NVARCHAR(150),
    Description NVARCHAR(MAX),
    IsPublic BIT,
    ApprovalStatus VARCHAR(20),
    IsCancelled BIT,
    CreatedAt DATETIME2(0),
    CanManage BIT
);
INSERT INTO @PublicView EXEC app.usp_Class_GetTeacherView @ClassID = @PublicClassID, @ActorID = @ViewerID;
INSERT @Results SELECT 'other teacher can read approved public class',
    CASE WHEN EXISTS (SELECT 1 FROM @PublicView WHERE CanManage = 0 AND Description = N'Public description' AND InviteCode IS NULL) THEN 1 ELSE 0 END;

DECLARE @ManagedView TABLE (
    ClassID INT,
    TeacherID INT,
    TeacherName NVARCHAR(100),
    InviteCode VARCHAR(20),
    ClassName NVARCHAR(150),
    Description NVARCHAR(MAX),
    IsPublic BIT,
    ApprovalStatus VARCHAR(20),
    IsCancelled BIT,
    CreatedAt DATETIME2(0),
    CanManage BIT
);
INSERT INTO @ManagedView EXEC app.usp_Class_GetTeacherView @ClassID = @PublicClassID, @ActorID = @OwnerID;
INSERT @Results SELECT 'owner retains class management access',
    CASE WHEN EXISTS (SELECT 1 FROM @ManagedView WHERE CanManage = 1 AND InviteCode IS NOT NULL) THEN 1 ELSE 0 END;

DELETE FROM @PublicView;
INSERT INTO @PublicView EXEC app.usp_Class_GetTeacherView @ClassID = @PrivateClassID, @ActorID = @ViewerID;
INSERT @Results SELECT 'other teacher cannot read private class', CASE WHEN NOT EXISTS (SELECT 1 FROM @PublicView) THEN 1 ELSE 0 END;

DELETE FROM @PublicView;
INSERT INTO @PublicView EXEC app.usp_Class_GetTeacherView @ClassID = @PendingClassID, @ActorID = @ViewerID;
INSERT @Results SELECT 'other teacher cannot read unapproved class', CASE WHEN NOT EXISTS (SELECT 1 FROM @PublicView) THEN 1 ELSE 0 END;

DECLARE @PreviewProblems TABLE (
    ProblemID INT,
    Title NVARCHAR(200),
    Difficulty VARCHAR(20),
    Status VARCHAR(20),
    TimeLimit INT,
    MemoryLimit INT,
    AssignedDate DATETIME2(0),
    DueDate DATETIME2(0),
    IsClosed BIT,
    UserStatus VARCHAR(10)
);
INSERT INTO @PreviewProblems EXEC app.usp_Class_GetPublicPreviewProblems @ClassID = @PublicClassID, @ActorID = @ViewerID;
INSERT @Results SELECT 'preview only returns public assigned problems',
    CASE WHEN EXISTS (SELECT 1 FROM @PreviewProblems WHERE ProblemID = @PublicProblemID)
          AND NOT EXISTS (SELECT 1 FROM @PreviewProblems WHERE ProblemID = @PrivateProblemID)
         THEN 1 ELSE 0 END;

BEGIN TRY
    EXEC app.usp_Class_GetStudents @ClassID = @PublicClassID, @ActorID = @ViewerID;
    INSERT @Results SELECT 'read-only teacher cannot view student list', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'read-only teacher cannot view student list', 1;
END CATCH;

IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;
