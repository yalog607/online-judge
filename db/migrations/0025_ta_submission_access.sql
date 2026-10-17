CREATE OR ALTER PROCEDURE app.usp_Submission_Get
    @SubmissionID INT,
    @RequesterID INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @OwnerID INT = (SELECT UserID FROM dbo.Submissions WHERE SubmissionID = @SubmissionID);
    IF @OwnerID IS NULL
        THROW 50022, N'Bai nop khong ton tai.', 1;
    IF @OwnerID <> @RequesterID
       AND NOT EXISTS (
           SELECT 1 FROM dbo.Users WHERE UserID = @RequesterID AND Role IN ('Teacher', 'Admin', 'TA')
       )
       AND NOT EXISTS (
           SELECT 1
           FROM dbo.Class_TA cta
           JOIN dbo.Class_Student cs ON cs.ClassID = cta.ClassID AND cs.UserID = @OwnerID
           WHERE cta.UserID_TA = @RequesterID
       )
        THROW 50023, N'Ban khong co quyen xem bai nop nay.', 1;

    SELECT s.SubmissionID, s.UserID, u.Username, u.FullName, s.ProblemID, s.ContestID, p.Title AS ProblemTitle, s.SourceCode,
           s.Language, s.SubmitTime, s.Result, s.Runtime, s.Memory, s.PassedCases
    FROM dbo.Submissions s
    JOIN dbo.Problems p ON p.ProblemID = s.ProblemID
    JOIN dbo.Users u ON u.UserID = s.UserID
    WHERE s.SubmissionID = @SubmissionID;

    SELECT sr.TestCaseID, sr.Verdict, sr.Runtime, sr.Memory, t.IsHidden
    FROM dbo.SubmissionResults sr
    JOIN dbo.Testcases t ON t.TestCaseID = sr.TestCaseID
    WHERE sr.SubmissionID = @SubmissionID
    ORDER BY t.OrderIndex;
END;
GO
