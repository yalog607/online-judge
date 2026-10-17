DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

BEGIN TRANSACTION;

DECLARE @UserID INT, @OwnerID INT, @ProblemID INT;
DECLARE @U VARCHAR(50) = 'sub_lim_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @O VARCHAR(50) = 'sub_own_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role)
VALUES (@U, 'hash', @U + '@test.com', N'Limit User', 'User'),
       (@O, 'hash', @O + '@test.com', N'Owner', 'Teacher');
SELECT @UserID = UserID FROM dbo.Users WHERE Username = @U;
SELECT @OwnerID = UserID FROM dbo.Users WHERE Username = @O;

INSERT INTO dbo.Problems (CreatorID, Title, Statement, Difficulty, Status)
VALUES (@OwnerID, N'Limit problem', N'desc', 'Easy', 'Public');
SET @ProblemID = SCOPE_IDENTITY();

-- Oversized source is rejected.
DECLARE @Big NVARCHAR(MAX) = REPLICATE(CAST(N'a' AS NVARCHAR(MAX)), 65537);
BEGIN TRY
    EXEC app.usp_Submission_Create @UserID = @UserID, @ProblemID = @ProblemID, @SourceCode = @Big, @Language = 'cpp';
    INSERT @Results SELECT 'source over 64KB is rejected', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'source over 64KB is rejected', IIF(ERROR_NUMBER() = 50046, 1, 0);
END CATCH;

-- Up to 5 pending submissions are accepted, the 6th is rejected.
DECLARE @i INT = 0, @Ok BIT = 1;
WHILE @i < 5
BEGIN
    BEGIN TRY
        EXEC app.usp_Submission_Create @UserID = @UserID, @ProblemID = @ProblemID, @SourceCode = N'int f(){return 1;}', @Language = 'cpp';
    END TRY
    BEGIN CATCH
        SET @Ok = 0;
    END CATCH;
    SET @i += 1;
END;
INSERT @Results SELECT 'five pending submissions are accepted', @Ok;

BEGIN TRY
    EXEC app.usp_Submission_Create @UserID = @UserID, @ProblemID = @ProblemID, @SourceCode = N'int f(){return 1;}', @Language = 'cpp';
    INSERT @Results SELECT 'sixth pending submission is rejected', 0;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'sixth pending submission is rejected', IIF(ERROR_NUMBER() = 50047, 1, 0);
END CATCH;

-- Finished submissions free the slots.
UPDATE dbo.Submissions SET Result = 'AC' WHERE UserID = @UserID;
BEGIN TRY
    EXEC app.usp_Submission_Create @UserID = @UserID, @ProblemID = @ProblemID, @SourceCode = N'int f(){return 1;}', @Language = 'cpp';
    INSERT @Results SELECT 'finished submissions free the pending slots', 1;
END TRY
BEGIN CATCH
    INSERT @Results SELECT 'finished submissions free the pending slots', 0;
END CATCH;

ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;

IF EXISTS (SELECT 1 FROM @Results WHERE Passed = 0)
    THROW 50000, 'Test failed', 1;
