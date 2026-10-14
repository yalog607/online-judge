DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

BEGIN TRANSACTION;

DECLARE @TeacherID INT, @StudentID INT, @StrangerID INT;

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role)
VALUES 
    ('doc_tea_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'doc_tea_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'Doc Teacher', 'Teacher'),
    ('doc_std_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'doc_std_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'Doc Student', 'User'),
    ('doc_str_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'doc_str_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'Doc Stranger', 'User');

SELECT @TeacherID = UserID FROM dbo.Users WHERE FullName = N'Doc Teacher' AND Email LIKE 'doc_tea_%';
SELECT @StudentID = UserID FROM dbo.Users WHERE FullName = N'Doc Student' AND Email LIKE 'doc_std_%';
SELECT @StrangerID = UserID FROM dbo.Users WHERE FullName = N'Doc Stranger' AND Email LIKE 'doc_str_%';

DECLARE @ClassID INT;
INSERT INTO dbo.Classes (TeacherID, InviteCode, ClassName, Description, IsPublic, ApprovalStatus)
VALUES (@TeacherID, 'DOCG' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 6), N'Doc Get Test Class', N'Description', 0, 'Approved');
SELECT @ClassID = SCOPE_IDENTITY();

INSERT INTO dbo.Class_Student (ClassID, UserID, JoinDate, ProgressPercent)
VALUES (@ClassID, @StudentID, SYSUTCDATETIME(), 0.0);

DECLARE @DocumentID INT;
INSERT INTO dbo.Documents (ClassID, FileName, CloudinaryURL, Category)
VALUES (@ClassID, N'lecture_notes.pdf', 'https://example.com/lecture_notes.pdf', N'Bài giảng');
SELECT @DocumentID = SCOPE_IDENTITY();

DECLARE @DocOutput TABLE (
    DocumentID INT,
    ClassID INT,
    FileName NVARCHAR(255),
    CloudinaryURL VARCHAR(2048),
    Category NVARCHAR(50),
    UploadDate DATETIME2(0)
);

INSERT INTO @DocOutput
EXEC app.usp_Document_Get @DocumentID = @DocumentID, @UserID = @TeacherID;

INSERT @Results SELECT 'teacher can get class document',
    CASE WHEN EXISTS (SELECT 1 FROM @DocOutput WHERE DocumentID = @DocumentID AND FileName = N'lecture_notes.pdf') THEN 1 ELSE 0 END;

DELETE FROM @DocOutput;
INSERT INTO @DocOutput
EXEC app.usp_Document_Get @DocumentID = @DocumentID, @UserID = @StudentID;

INSERT @Results SELECT 'enrolled student can get class document',
    CASE WHEN EXISTS (SELECT 1 FROM @DocOutput WHERE DocumentID = @DocumentID AND FileName = N'lecture_notes.pdf') THEN 1 ELSE 0 END;

BEGIN TRY
    EXEC app.usp_Document_Get @DocumentID = @DocumentID, @UserID = @StrangerID;
    INSERT @Results SELECT 'stranger cannot access private class document', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'stranger cannot access private class document', 1;
END CATCH;

BEGIN TRY
    EXEC app.usp_Document_Get @DocumentID = 99999999, @UserID = @TeacherID;
    INSERT @Results SELECT 'non existent document throws 50031', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'non existent document throws 50031', 1;
END CATCH;

IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;
