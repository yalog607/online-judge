CREATE OR ALTER PROCEDURE app.usp_Submission_Create
    @UserID INT,
    @ProblemID INT,
    @SourceCode NVARCHAR(MAX),
    @Language VARCHAR(20),
    @ContestID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Status VARCHAR(20), @CreatorID INT;
    SELECT @Status = Status, @CreatorID = CreatorID FROM dbo.Problems WHERE ProblemID = @ProblemID;

    IF @Status IS NULL
        THROW 50020, 'Bai tap khong ton tai.', 1;
    IF @Status <> 'Public' AND @CreatorID <> @UserID
       AND NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role = 'Admin')
        THROW 50021, 'Ban khong co quyen nop bai cho bai tap nay.', 1;

    INSERT dbo.Submissions (UserID, ProblemID, ContestID, SourceCode, Language)
    VALUES (@UserID, @ProblemID, @ContestID, @SourceCode, @Language);

    SELECT SCOPE_IDENTITY() AS SubmissionID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Submission_ListForUser
    @UserID INT,
    @ProblemID INT,
    @Page INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    SELECT SubmissionID, Language, Result, Runtime, Memory, PassedCases, SubmitTime,
           COUNT(*) OVER () AS TotalCount
    FROM dbo.Submissions
    WHERE UserID = @UserID AND ProblemID = @ProblemID
    ORDER BY SubmitTime DESC
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Submission_Get
    @SubmissionID INT,
    @RequesterID INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @OwnerID INT = (SELECT UserID FROM dbo.Submissions WHERE SubmissionID = @SubmissionID);
    IF @OwnerID IS NULL
        THROW 50022, 'Bai nop khong ton tai.', 1;
    IF @OwnerID <> @RequesterID
       AND NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @RequesterID AND Role IN ('Teacher', 'Admin'))
        THROW 50023, 'Ban khong co quyen xem bai nop nay.', 1;

    SELECT s.SubmissionID, s.UserID, s.ProblemID, p.Title AS ProblemTitle, s.SourceCode,
           s.Language, s.SubmitTime, s.Result, s.Runtime, s.Memory, s.PassedCases
    FROM dbo.Submissions s
    JOIN dbo.Problems p ON p.ProblemID = s.ProblemID
    WHERE s.SubmissionID = @SubmissionID;

    SELECT sr.TestCaseID, sr.Verdict, sr.Runtime, sr.Memory, t.IsHidden
    FROM dbo.SubmissionResults sr
    JOIN dbo.Testcases t ON t.TestCaseID = sr.TestCaseID
    WHERE sr.SubmissionID = @SubmissionID
    ORDER BY t.OrderIndex;
END
GO
