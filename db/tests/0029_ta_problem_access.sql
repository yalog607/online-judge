DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

BEGIN TRANSACTION;

DECLARE @TAID INT, @OtherUserID INT, @ProblemID INT;

INSERT INTO dbo.Users (Username, Password, Email, FullName, Role)
VALUES 
    ('ta_acc_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'ta_acc_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'TA Problem Creator', 'TA'),
    ('oth_acc_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8), 'hash', 'oth_acc_' + LEFT(CAST(NEWID() AS VARCHAR(36)), 8) + '@test.com', N'Other Student', 'User');

SELECT @TAID = UserID FROM dbo.Users WHERE FullName = N'TA Problem Creator' AND Role = 'TA';
SELECT @OtherUserID = UserID FROM dbo.Users WHERE FullName = N'Other Student' AND Role = 'User';

INSERT INTO dbo.Problems (CreatorID, Title, Statement, Difficulty, Status)
VALUES (@TAID, N'TA Pending Problem', N'Statement content', 'Medium', 'Pending');
SET @ProblemID = SCOPE_IDENTITY();

DECLARE @CanAccessSelf BIT = app.ufn_CanUserAccessProblem(@ProblemID, @TAID);
IF @CanAccessSelf = 1
    INSERT @Results SELECT 'ta creator can access own pending problem', 1;
ELSE
    INSERT @Results SELECT 'ta creator can access own pending problem', 0;

DECLARE @CanAccessOther BIT = app.ufn_CanUserAccessProblem(@ProblemID, @OtherUserID);
IF @CanAccessOther = 0
    INSERT @Results SELECT 'other student cannot access pending problem', 1;
ELSE
    INSERT @Results SELECT 'other student cannot access pending problem', 0;

DECLARE @CheckAccessTable TABLE (CanAccess BIT);
INSERT INTO @CheckAccessTable
EXEC app.usp_Problem_CheckAccess @ProblemID = @ProblemID, @UserID = @TAID;

IF EXISTS (SELECT 1 FROM @CheckAccessTable WHERE CanAccess = 1)
    INSERT @Results SELECT 'usp_Problem_CheckAccess returns 1 for ta creator', 1;
ELSE
    INSERT @Results SELECT 'usp_Problem_CheckAccess returns 1 for ta creator', 0;

ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;

IF EXISTS (SELECT 1 FROM @Results WHERE Passed = 0)
    THROW 50000, 'Test failed', 1;
