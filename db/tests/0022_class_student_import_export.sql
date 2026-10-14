DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

BEGIN TRANSACTION;

DECLARE @TeacherID INT, @OtherUserID INT, @Std1ID INT, @Std2ID INT, @Std3ID INT;

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role)
VALUES 
    ('tie_tea_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'tie_tea_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'Test Teacher', 'Teacher'),
    ('tie_oth_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'tie_oth_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'Other User', 'User'),
    ('tie_st1_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'tie_st1_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'Student One', 'User'),
    ('tie_st2_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'tie_st2_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'Student Two', 'User'),
    ('tie_st3_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'tie_st3_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'Student Three', 'User');

SELECT @TeacherID = UserID FROM dbo.Users WHERE FullName = N'Test Teacher' AND Email LIKE 'tie_tea_%';
SELECT @OtherUserID = UserID FROM dbo.Users WHERE FullName = N'Other User' AND Email LIKE 'tie_oth_%';
SELECT @Std1ID = UserID FROM dbo.Users WHERE FullName = N'Student One' AND Email LIKE 'tie_st1_%';
SELECT @Std2ID = UserID FROM dbo.Users WHERE FullName = N'Student Two' AND Email LIKE 'tie_st2_%';
SELECT @Std3ID = UserID FROM dbo.Users WHERE FullName = N'Student Three' AND Email LIKE 'tie_st3_%';

DECLARE @TeaEmail NVARCHAR(100) = (SELECT Email FROM dbo.Users WHERE UserID = @TeacherID);
DECLARE @Std1Username NVARCHAR(50) = (SELECT Username FROM dbo.Users WHERE UserID = @Std1ID);
DECLARE @Std2Email NVARCHAR(100) = (SELECT Email FROM dbo.Users WHERE UserID = @Std2ID);
DECLARE @Std3Username NVARCHAR(50) = (SELECT Username FROM dbo.Users WHERE UserID = @Std3ID);

DECLARE @ClassID INT;
INSERT INTO dbo.Classes (TeacherID, InviteCode, ClassName, Description, IsPublic, ApprovalStatus)
VALUES (@TeacherID, 'TIEC' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 6), N'Import Export Test Class', N'Description', 1, 'Approved');
SELECT @ClassID = SCOPE_IDENTITY();

INSERT INTO dbo.Class_Student (ClassID, UserID, JoinDate, ProgressPercent)
VALUES (@ClassID, @Std1ID, SYSUTCDATETIME(), 10.0);

DECLARE @Json NVARCHAR(MAX) = N'['
    + N'{"identifier":"' + @Std1Username + N'"},'
    + N'{"identifier":"' + @Std2Email + N'"},'
    + N'{"identifier":"' + @Std2Email + N'"},'
    + N'{"identifier":"nonexistent_user_xyz@test.com"},'
    + N'{"identifier":"' + @TeaEmail + N'"}'
    + N']';

DECLARE @ImportOutputs TABLE (
    RowOrder INT,
    Identifier NVARCHAR(255),
    UserID INT NULL,
    Username NVARCHAR(50) NULL,
    FullName NVARCHAR(100) NULL,
    Email NVARCHAR(100) NULL,
    Status VARCHAR(30)
);

INSERT INTO @ImportOutputs
EXEC app.usp_Class_ImportStudents @ClassID = @ClassID, @ActorID = @TeacherID, @StudentsJson = @Json;

INSERT @Results SELECT 'already enrolled student returns ALREADY_EXISTS',
    CASE WHEN EXISTS (SELECT 1 FROM @ImportOutputs WHERE RowOrder = 1 AND Status = 'ALREADY_EXISTS' AND UserID = @Std1ID) THEN 1 ELSE 0 END;

INSERT @Results SELECT 'new student returns SUCCESS and is enrolled',
    CASE WHEN EXISTS (SELECT 1 FROM @ImportOutputs WHERE RowOrder = 2 AND Status = 'SUCCESS' AND UserID = @Std2ID)
          AND EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @ClassID AND UserID = @Std2ID)
         THEN 1 ELSE 0 END;

INSERT @Results SELECT 'duplicate student in file returns DUPLICATE_IN_FILE',
    CASE WHEN EXISTS (SELECT 1 FROM @ImportOutputs WHERE RowOrder = 3 AND Status = 'DUPLICATE_IN_FILE' AND UserID = @Std2ID) THEN 1 ELSE 0 END;

INSERT @Results SELECT 'non existent student returns NOT_FOUND',
    CASE WHEN EXISTS (SELECT 1 FROM @ImportOutputs WHERE RowOrder = 4 AND Status = 'NOT_FOUND' AND UserID IS NULL) THEN 1 ELSE 0 END;

INSERT @Results SELECT 'class teacher returns CANNOT_ADD_TEACHER',
    CASE WHEN EXISTS (SELECT 1 FROM @ImportOutputs WHERE RowOrder = 5 AND Status = 'CANNOT_ADD_TEACHER' AND UserID = @TeacherID) THEN 1 ELSE 0 END;

BEGIN TRY
    EXEC app.usp_Class_ImportStudents @ClassID = @ClassID, @ActorID = @OtherUserID, @StudentsJson = @Json;
    INSERT @Results SELECT 'unauthorized actor is rejected', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'unauthorized actor is rejected', 1;
END CATCH;

IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;
