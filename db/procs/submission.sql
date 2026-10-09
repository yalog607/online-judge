CREATE OR ALTER PROCEDURE app.usp_Submission_Create
    @UserID INT,
    @ProblemID INT,
    @SourceCode NVARCHAR(MAX),
    @Language VARCHAR(20),
    @ContestID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @Status VARCHAR(20), @CreatorID INT;
        SELECT @Status = Status, @CreatorID = CreatorID FROM dbo.Problems WHERE ProblemID = @ProblemID;

    IF @Status IS NULL
        THROW 50020, 'Bai tap khong ton tai.', 1;

    IF @Status = 'Hidden'
        THROW 50026, 'Bai tap da bi khoa.', 1;

    IF @ContestID IS NOT NULL
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM dbo.Contest_Problem 
            WHERE ContestID = @ContestID AND ProblemID = @ProblemID
        )
            THROW 50022, 'Bai tap khong thuoc ky thi nay.', 1;

        DECLARE @ContestStatus VARCHAR(20);
        SELECT @ContestStatus = app.ufn_GetContestStatus(StartTime, EndTime)
        FROM dbo.Contests WHERE ContestID = @ContestID;

        IF @ContestStatus = 'Upcoming'
            THROW 50023, 'Ky thi chua bat dau.', 1;
        IF @ContestStatus = 'Ended'
            THROW 50024, 'Ky thi da ket thuc.', 1;

        IF app.ufn_CanUserAccessContest(@ContestID, @UserID) = 0
            THROW 50025, 'Ban khong co quyen tham gia ky thi nay.', 1;

        IF EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role IN ('Teacher', 'Admin'))
            THROW 50027, 'Giao vien hoac Admin khong the tham gia hay nop bai trong ky thi.', 1;

        IF app.ufn_CanUserAccessContest(@ContestID, @UserID) = 1 AND NOT EXISTS (SELECT 1 FROM dbo.Contest_User WHERE ContestID = @ContestID AND UserID = @UserID)
            THROW 50027, 'Ban dang co quyen quan ly ky thi nay nen khong the nop bai nhu thi sinh.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.Contest_User WHERE ContestID = @ContestID AND UserID = @UserID)
        BEGIN
            INSERT dbo.Contest_User (ContestID, UserID, TotalScore, PenaltyTime)
            VALUES (@ContestID, @UserID, 0, 0);
        END;
    END
    ELSE
    BEGIN
        IF app.ufn_CanUserAccessProblem(@ProblemID, @UserID) = 0
            THROW 50021, 'Ban khong co quyen nop bai cho bai tap nay.', 1;
    END;

        BEGIN TRANSACTION;
        INSERT dbo.Submissions (UserID, ProblemID, ContestID, SourceCode, Language)
        VALUES (@UserID, @ProblemID, @ContestID, @SourceCode, @Language);
        
        DECLARE @NewID INT = SCOPE_IDENTITY();
        COMMIT TRANSACTION;
        
        SELECT @NewID AS SubmissionID;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
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

CREATE OR ALTER PROCEDURE app.usp_Judge_RequestRejudge
    @SubmissionID INT,
    @ActorID INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check permissions
    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role IN ('Teacher', 'Admin', 'TA'))
        THROW 50050, 'Ban khong co quyen thuc hien thao tac nay.', 1;

    -- Check if submission exists
    IF NOT EXISTS (SELECT 1 FROM dbo.Submissions WHERE SubmissionID = @SubmissionID)
        THROW 50051, 'Bai nop khong ton tai.', 1;

    BEGIN TRANSACTION;

    UPDATE dbo.Submissions
    SET Result = 'Pending', ClaimedBy = NULL, ClaimedAt = NULL, JudgedAt = NULL,
        Runtime = NULL, Memory = NULL, PassedCases = NULL
    WHERE SubmissionID = @SubmissionID;

    DELETE FROM dbo.SubmissionResults WHERE SubmissionID = @SubmissionID;

    COMMIT TRANSACTION;
END
GO
