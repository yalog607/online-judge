CREATE OR ALTER TRIGGER dbo.trg_Contests_AuditLog
ON dbo.Contests
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT dbo.AuditLog (ActorID, Action, TargetType, TargetID, Detail)
        SELECT CreatorID, 'CONTEST_CREATE', 'Contest', ContestID, ContestName
        FROM inserted;
    END;

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT dbo.AuditLog (ActorID, Action, TargetType, TargetID, Detail)
        SELECT CreatorID, 'CONTEST_UPDATE', 'Contest', ContestID, ContestName
        FROM inserted;
    END;

    IF NOT EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT dbo.AuditLog (ActorID, Action, TargetType, TargetID, Detail)
        SELECT CreatorID, 'CONTEST_DELETE', 'Contest', ContestID, ContestName
        FROM deleted;
    END;
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_Contest_UpdateLeaderboard
ON dbo.Submissions
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT UPDATE(Result)
        RETURN;

    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
        SELECT 
            i.SubmissionID,
            i.ContestID,
            i.UserID,
            i.ProblemID,
            i.Result,
            i.SubmitTime,
            c.StartTime,
            cp.MaxScore
        FROM inserted i
        JOIN dbo.Contests c ON c.ContestID = i.ContestID
        JOIN dbo.Contest_Problem cp ON cp.ContestID = i.ContestID AND cp.ProblemID = i.ProblemID
        WHERE i.ContestID IS NOT NULL 
          AND i.Result IN ('AC', 'WA', 'TLE', 'MLE', 'RE');

    OPEN cur;

    DECLARE @SubID INT, @ContestID INT, @UserID INT, @ProblemID INT;
    DECLARE @Result VARCHAR(20), @SubmitTime DATETIME2(0), @StartTime DATETIME2(0), @MaxScore INT;

    FETCH NEXT FROM cur INTO @SubID, @ContestID, @UserID, @ProblemID, @Result, @SubmitTime, @StartTime, @MaxScore;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF NOT EXISTS (
            SELECT 1 
            FROM dbo.Contest_User 
            WHERE ContestID = @ContestID AND UserID = @UserID
        )
        BEGIN
            INSERT dbo.Contest_User (ContestID, UserID, TotalScore, PenaltyTime)
            VALUES (@ContestID, @UserID, 0, 0);
        END;

        IF NOT EXISTS (
            SELECT 1 
            FROM dbo.ContestProblemResults 
            WHERE ContestID = @ContestID AND UserID = @UserID AND ProblemID = @ProblemID
        )
        BEGIN
            INSERT dbo.ContestProblemResults (ContestID, UserID, ProblemID, WrongCount, Solved, SolveMinute)
            VALUES (@ContestID, @UserID, @ProblemID, 0, 0, NULL);
        END;

        DECLARE @CurrentSolved BIT;
        DECLARE @CurrentWrongCount INT;

        SELECT 
            @CurrentSolved = Solved,
            @CurrentWrongCount = WrongCount
        FROM dbo.ContestProblemResults
        WHERE ContestID = @ContestID AND UserID = @UserID AND ProblemID = @ProblemID;

        IF @CurrentSolved = 0
        BEGIN
            IF @Result = 'AC'
            BEGIN
                DECLARE @SolveMinute INT = DATEDIFF(MINUTE, @StartTime, @SubmitTime);
                IF @SolveMinute < 0 SET @SolveMinute = 0;

                UPDATE dbo.ContestProblemResults
                SET Solved = 1,
                    SolveMinute = @SolveMinute
                WHERE ContestID = @ContestID AND UserID = @UserID AND ProblemID = @ProblemID;

                UPDATE dbo.Contest_User
                SET PenaltyTime = PenaltyTime + @SolveMinute + (@CurrentWrongCount * 20)
                WHERE ContestID = @ContestID AND UserID = @UserID;
            END
            ELSE
            BEGIN
                UPDATE dbo.ContestProblemResults
                SET WrongCount = WrongCount + 1
                WHERE ContestID = @ContestID AND UserID = @UserID AND ProblemID = @ProblemID;
            END;
        END;

        -- Điểm của câu = tỉ lệ testcase đạt tốt nhất (trong các lần nộp của kỳ thi) x điểm của câu.
        UPDATE dbo.ContestProblemResults
        SET BestRatio = ISNULL((
            SELECT MAX(app.ufn_SubmissionRatio(s.Result, s.Score, s.MaxScore, s.PassedCases))
            FROM dbo.Submissions s
            WHERE s.ContestID = @ContestID AND s.UserID = @UserID AND s.ProblemID = @ProblemID
        ), 0)
        WHERE ContestID = @ContestID AND UserID = @UserID AND ProblemID = @ProblemID;

        UPDATE cu
        SET TotalScore = ISNULL((
            SELECT SUM(cpr.BestRatio * cp.MaxScore)
            FROM dbo.ContestProblemResults cpr
            JOIN dbo.Contest_Problem cp ON cp.ContestID = cpr.ContestID AND cp.ProblemID = cpr.ProblemID
            WHERE cpr.ContestID = cu.ContestID AND cpr.UserID = cu.UserID
        ), 0)
        FROM dbo.Contest_User cu
        WHERE cu.ContestID = @ContestID AND cu.UserID = @UserID;

        FETCH NEXT FROM cur INTO @SubID, @ContestID, @UserID, @ProblemID, @Result, @SubmitTime, @StartTime, @MaxScore;
    END;

    CLOSE cur;
    DEALLOCATE cur;
END;
GO
