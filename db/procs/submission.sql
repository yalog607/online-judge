CREATE OR ALTER PROCEDURE app.usp_Submission_Create
    @UserID INT,
    @ProblemID INT,
    @SourceCode NVARCHAR(MAX),
    @Language VARCHAR(20),
    @ContestID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    -- Checked before BEGIN TRY: the CATCH below rolls back any open transaction, which would
    -- also roll back a caller's outer transaction for a plain input rejection.
    IF LEN(@SourceCode) > 65536
        THROW 50046, N'Mã nguồn tối đa 64KB.', 1;

    IF (SELECT COUNT(*) FROM dbo.Submissions WHERE UserID = @UserID AND Result IN ('Pending', 'Judging')) >= 5
        THROW 50047, N'Bạn có quá nhiều bài đang chờ chấm, vui lòng đợi kết quả rồi nộp tiếp.', 1;

    BEGIN TRY
        DECLARE @Status VARCHAR(20), @CreatorID INT;
        SELECT @Status = Status, @CreatorID = CreatorID FROM dbo.Problems WHERE ProblemID = @ProblemID;

    IF @Status IS NULL
        THROW 50020, N'Bài tập không tồn tại.', 1;

    IF @Status = 'Hidden'
        THROW 50026, N'Bài tập đã bị khóa.', 1;

    IF @ContestID IS NOT NULL
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM dbo.Contest_Problem 
            WHERE ContestID = @ContestID AND ProblemID = @ProblemID
        )
            THROW 50022, N'Bài tập không thuộc kỳ thi này.', 1;

        DECLARE @ContestStatus VARCHAR(20);
        SELECT @ContestStatus = app.ufn_GetContestStatus(StartTime, EndTime)
        FROM dbo.Contests WHERE ContestID = @ContestID;

        IF @ContestStatus = 'Upcoming'
            THROW 50023, N'Kỳ thi chưa bắt đầu.', 1;
        IF @ContestStatus = 'Ended'
            THROW 50024, N'Kỳ thi đã kết thúc.', 1;

        IF @Status NOT IN ('Public', 'Private')
            THROW 50025, N'Bài tập không ở trạng thái hợp lệ cho kỳ thi.', 1;

        IF app.ufn_CanUserAccessContestProblem(@ContestID, @ProblemID, @UserID) = 0
            THROW 50025, N'Bạn không có quyền tham gia kỳ thi này.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role IN ('User', 'Teacher'))
            THROW 50027, N'Tài khoản này không thể nộp bài trong kỳ thi.', 1;

        IF app.ufn_CanUserAccessContest(@ContestID, @UserID) = 1 AND NOT EXISTS (SELECT 1 FROM dbo.Contest_User WHERE ContestID = @ContestID AND UserID = @UserID)
            THROW 50027, N'Bạn đang có quyền quản lý kỳ thi này nên không thể nộp bài như thí sinh.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.Contest_User WHERE ContestID = @ContestID AND UserID = @UserID)
        BEGIN
            INSERT dbo.Contest_User (ContestID, UserID, TotalScore, PenaltyTime)
            VALUES (@ContestID, @UserID, 0, 0);
        END;
    END
    ELSE
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM dbo.Classes c
            JOIN dbo.Class_Problem cp ON cp.ClassID = c.ClassID
            JOIN dbo.Class_Student cs ON cs.ClassID = c.ClassID AND cs.UserID = @UserID
            WHERE c.IsCancelled = 1 AND cp.ProblemID = @ProblemID
        )
            THROW 50041, N'Lớp học đã được hủy; không thể nộp bài mới cho bài tập của lớp.', 1;

        IF app.ufn_CanUserAccessProblem(@ProblemID, @UserID) = 0
            THROW 50021, N'Bạn không có quyền nộp bài cho bài tập này.', 1;
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
END
GO

CREATE OR ALTER PROCEDURE app.usp_Judge_RequestRejudge
    @SubmissionID INT,
    @ActorID INT
AS
BEGIN
    SET NOCOUNT ON;
    
    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role IN ('Teacher', 'Admin', 'TA'))
        THROW 50050, N'Ban khong co quyen thuc hien thao tac nay.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Submissions WHERE SubmissionID = @SubmissionID)
        THROW 50051, N'Bai nop khong ton tai.', 1;

    BEGIN TRANSACTION;

    UPDATE dbo.Submissions
    SET Result = 'Pending', ClaimedBy = NULL, ClaimedAt = NULL, JudgedAt = NULL,
        Runtime = NULL, Memory = NULL, PassedCases = NULL
    WHERE SubmissionID = @SubmissionID;

    DELETE FROM dbo.SubmissionResults WHERE SubmissionID = @SubmissionID;

    COMMIT TRANSACTION;
END
GO
