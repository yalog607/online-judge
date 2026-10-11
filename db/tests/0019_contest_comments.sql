DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @TeacherID INT, @StudentID INT, @OtherID INT, @ContestID INT, @CommentID INT;
DECLARE @Suffix VARCHAR(12) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 12);
DECLARE @CreatedComment TABLE (CommentID INT);

INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES
 ('ccfix_teacher_' + @Suffix, 'hash', 'ccfix_t_' + @Suffix + '@test.com', N'Contest Comment Teacher', 'Teacher'),
 ('ccfix_student_' + @Suffix, 'hash', 'ccfix_s_' + @Suffix + '@test.com', N'Contest Comment Student', 'User'),
 ('ccfix_other_' + @Suffix, 'hash', 'ccfix_o_' + @Suffix + '@test.com', N'Contest Comment Other', 'User');
SELECT @TeacherID = MAX(CASE WHEN Username = 'ccfix_teacher_' + @Suffix THEN UserID END),
       @StudentID = MAX(CASE WHEN Username = 'ccfix_student_' + @Suffix THEN UserID END),
       @OtherID = MAX(CASE WHEN Username = 'ccfix_other_' + @Suffix THEN UserID END)
FROM dbo.Users;

INSERT dbo.Contests (CreatorID, ContestName, StartTime, EndTime)
VALUES (@TeacherID, N'Contest comment integration ' + @Suffix, DATEADD(HOUR, -1, SYSUTCDATETIME()), DATEADD(HOUR, 1, SYSUTCDATETIME()));
SET @ContestID = SCOPE_IDENTITY();
INSERT dbo.Contest_User (ContestID, UserID) VALUES (@ContestID, @StudentID);

INSERT @CreatedComment EXEC app.usp_ContestComment_Add
    @ContestID = @ContestID, @UserID = @StudentID, @Content = N'Bình luận từ thí sinh';
SELECT @CommentID = CommentID FROM @CreatedComment;
INSERT @Results VALUES ('Joined contestant can post a comment', CASE WHEN @CommentID IS NOT NULL THEN 1 ELSE 0 END);

DELETE @CreatedComment;
INSERT @CreatedComment EXEC app.usp_ContestComment_Add
    @ContestID = @ContestID, @UserID = @TeacherID, @Content = N'Bình luận từ giảng viên';
INSERT @Results VALUES ('Contest teacher can post a comment', CASE WHEN EXISTS (SELECT 1 FROM @CreatedComment) THEN 1 ELSE 0 END);

BEGIN TRY
    EXEC app.usp_ContestComment_Add @ContestID = @ContestID, @UserID = @OtherID, @Content = N'Người ngoài';
    INSERT @Results VALUES ('Non-participant cannot post a comment', 0);
END TRY BEGIN CATCH
    INSERT @Results VALUES ('Non-participant cannot post a comment', CASE WHEN ERROR_NUMBER() = 50071 THEN 1 ELSE 0 END);
END CATCH;

BEGIN TRY
    EXEC app.usp_ContestComment_Add @ContestID = @ContestID, @UserID = @StudentID, @Content = N'   ';
    INSERT @Results VALUES ('Empty comment is rejected', 0);
END TRY BEGIN CATCH
    INSERT @Results VALUES ('Empty comment is rejected', CASE WHEN ERROR_NUMBER() = 50070 THEN 1 ELSE 0 END);
END CATCH;

DELETE dbo.ContestComments WHERE ContestID = @ContestID;
DELETE dbo.Contests WHERE ContestID = @ContestID;
DELETE dbo.Users WHERE UserID IN (@TeacherID, @StudentID, @OtherID);

SELECT Assertion, Passed FROM @Results;
