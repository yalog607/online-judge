DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

DECLARE @UserID INT, @OtherID INT, @ProblemID INT, @C1 INT, @C2 INT;

INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES ('cmt_user1', 'x', 'cmt_user1@test.com', N'Cmt User 1', 'User');
SET @UserID = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES ('cmt_user2', 'x', 'cmt_user2@test.com', N'Cmt User 2', 'User');
SET @OtherID = SCOPE_IDENTITY();

INSERT dbo.Problems (CreatorID, Title, Statement, TimeLimit, MemoryLimit, Difficulty, Status)
VALUES (@UserID, N'Cmt problem', N'x', 1000, 256, 'Easy', 'Public');
SET @ProblemID = SCOPE_IDENTITY();

DECLARE @Ids TABLE (CommentID INT);
INSERT @Ids EXEC app.usp_Comment_Add @ProblemID = @ProblemID, @UserID = @UserID, @Content = N'Goc';
SELECT @C1 = CommentID FROM @Ids;
DELETE @Ids;
INSERT @Ids EXEC app.usp_Comment_Add @ProblemID = @ProblemID, @UserID = @OtherID, @ParentID = @C1, @Content = N'Tra loi';
SELECT @C2 = CommentID FROM @Ids;
INSERT @Results VALUES ('Comment and reply are created', CASE WHEN @C1 IS NOT NULL AND @C2 IS NOT NULL THEN 1 ELSE 0 END);

BEGIN TRY
    EXEC app.usp_Comment_Add @ProblemID = @ProblemID, @UserID = @UserID, @Content = N'   ';
    INSERT @Results VALUES ('Empty comment is rejected', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Empty comment is rejected', 1);
END CATCH;

BEGIN TRY
    EXEC app.usp_Comment_Add @ProblemID = @ProblemID, @UserID = @UserID, @ParentID = @C2, @Content = N'Long 2 cap';
    INSERT @Results VALUES ('Reply to a reply is rejected', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Reply to a reply is rejected', 1);
END CATCH;

EXEC app.usp_Comment_ToggleLike @CommentID = @C1, @UserID = @OtherID;
INSERT @Results VALUES ('Like is recorded',
    CASE WHEN (SELECT COUNT(*) FROM dbo.ProblemCommentLikes WHERE CommentID = @C1) = 1 THEN 1 ELSE 0 END);
EXEC app.usp_Comment_ToggleLike @CommentID = @C1, @UserID = @OtherID;
INSERT @Results VALUES ('Second toggle removes like',
    CASE WHEN (SELECT COUNT(*) FROM dbo.ProblemCommentLikes WHERE CommentID = @C1) = 0 THEN 1 ELSE 0 END);

BEGIN TRY
    EXEC app.usp_Comment_Delete @CommentID = @C1, @UserID = @OtherID;
    INSERT @Results VALUES ('Non-author student cannot delete', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Non-author student cannot delete', 1);
END CATCH;

EXEC app.usp_Comment_Delete @CommentID = @C1, @UserID = @UserID;
INSERT @Results VALUES ('Author delete removes comment and replies',
    CASE WHEN NOT EXISTS (SELECT 1 FROM dbo.ProblemComments WHERE ProblemID = @ProblemID) THEN 1 ELSE 0 END);

DELETE FROM dbo.Problems WHERE ProblemID = @ProblemID;
DELETE FROM dbo.Users WHERE UserID IN (@UserID, @OtherID);

SELECT Assertion, Passed FROM @Results;
