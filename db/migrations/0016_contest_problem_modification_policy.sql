DROP TRIGGER IF EXISTS dbo.trg_Contest_Problem_PreventOngoingModifications;
GO

CREATE OR ALTER PROCEDURE app.usp_Contest_AddProblem
    @ContestID INT,
    @ProblemID INT,
    @RequesterID INT,
    @MaxScore INT = 100,
    @OrderIndex INT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (
            SELECT 1
            FROM dbo.Contests c WITH (UPDLOCK, HOLDLOCK)
            JOIN dbo.Users u ON u.UserID = @RequesterID
            WHERE c.ContestID = @ContestID
              AND (c.CreatorID = @RequesterID OR u.Role = 'Admin')
        )
            THROW 50035, 'Ban khong co quyen them bai tap vao ky thi nay.', 1;

        DECLARE @ProblemStatus VARCHAR(20), @ProblemCreatorID INT, @RequesterRole VARCHAR(20);
        SELECT @ProblemStatus = Status, @ProblemCreatorID = CreatorID
        FROM dbo.Problems WITH (UPDLOCK, HOLDLOCK)
        WHERE ProblemID = @ProblemID;

        SELECT @RequesterRole = Role FROM dbo.Users WHERE UserID = @RequesterID;

        IF @ProblemStatus IS NULL
            THROW 50036, 'Bai tap khong ton tai.', 1;

        IF @ProblemStatus NOT IN ('Public', 'Private')
            THROW 50037, 'Chi co the them bai Cong khai hoac bai Rieng tu duoc phep quan ly.', 1;

        IF @ProblemStatus = 'Private'
           AND @RequesterRole <> 'Admin'
           AND NOT (
               @RequesterRole = 'Teacher'
               AND (
                   @ProblemCreatorID = @RequesterID
                   OR EXISTS (
                       SELECT 1
                       FROM dbo.Class_Problem cp
                       JOIN dbo.Classes c ON c.ClassID = cp.ClassID
                       WHERE cp.ProblemID = @ProblemID AND c.TeacherID = @RequesterID
                   )
               )
           )
            THROW 50037, 'Ban khong co quyen su dung bai Rieng tu nay trong ky thi.', 1;

        IF EXISTS (SELECT 1 FROM dbo.Contest_Problem WHERE ContestID = @ContestID AND ProblemID = @ProblemID)
        BEGIN
            UPDATE dbo.Contest_Problem
            SET MaxScore = @MaxScore,
                OrderIndex = @OrderIndex
            WHERE ContestID = @ContestID AND ProblemID = @ProblemID;

            UPDATE cu
            SET TotalScore = ISNULL(scores.TotalScore, 0)
            FROM dbo.Contest_User cu
            OUTER APPLY (
                SELECT SUM(cp.MaxScore) AS TotalScore
                FROM dbo.ContestProblemResults cpr
                JOIN dbo.Contest_Problem cp ON cp.ContestID = cpr.ContestID AND cp.ProblemID = cpr.ProblemID
                WHERE cpr.ContestID = cu.ContestID AND cpr.UserID = cu.UserID AND cpr.Solved = 1
            ) scores
            WHERE cu.ContestID = @ContestID;
        END
        ELSE
        BEGIN
            INSERT dbo.Contest_Problem (ContestID, ProblemID, MaxScore, OrderIndex)
            VALUES (@ContestID, @ProblemID, @MaxScore, @OrderIndex);
        END;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Contest_UpdateProblemScore
    @ContestID INT,
    @ProblemID INT,
    @RequesterID INT,
    @MaxScore INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Contests c
        LEFT JOIN dbo.Users u ON u.UserID = @RequesterID
        WHERE c.ContestID = @ContestID
          AND (c.CreatorID = @RequesterID OR u.Role = 'Admin')
    )
        THROW 50035, 'Ban khong co quyen cap nhat diem bai tap trong ky thi nay.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Contest_Problem WHERE ContestID = @ContestID AND ProblemID = @ProblemID)
        THROW 50036, 'Bai tap khong thuoc ky thi nay.', 1;

    IF @MaxScore <= 0
        THROW 50037, 'Diem toi da phai lon hon 0.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.Contest_Problem
        SET MaxScore = @MaxScore
        WHERE ContestID = @ContestID AND ProblemID = @ProblemID;

        UPDATE cu
        SET TotalScore = ISNULL(scores.TotalScore, 0)
        FROM dbo.Contest_User cu
        OUTER APPLY (
            SELECT SUM(cp.MaxScore) AS TotalScore
            FROM dbo.ContestProblemResults cpr
            JOIN dbo.Contest_Problem cp ON cp.ContestID = cpr.ContestID AND cp.ProblemID = cpr.ProblemID
            WHERE cpr.ContestID = cu.ContestID AND cpr.UserID = cu.UserID AND cpr.Solved = 1
        ) scores
        WHERE cu.ContestID = @ContestID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE app.usp_Contest_RemoveProblem
    @ContestID INT,
    @ProblemID INT,
    @RequesterID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 
        FROM dbo.Contests c
        LEFT JOIN dbo.Users u ON u.UserID = @RequesterID
        WHERE c.ContestID = @ContestID 
          AND (c.CreatorID = @RequesterID OR u.Role = 'Admin')
    )
        THROW 50037, 'Ban khong co quyen xoa bai tap khoi ky thi nay.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        DELETE FROM dbo.ContestProblemResults
        WHERE ContestID = @ContestID AND ProblemID = @ProblemID;

        DELETE FROM dbo.Contest_Problem 
        WHERE ContestID = @ContestID AND ProblemID = @ProblemID;

        UPDATE dbo.Submissions
        SET ContestID = NULL
        WHERE ContestID = @ContestID AND ProblemID = @ProblemID;

        UPDATE cu
        SET TotalScore = ISNULL(scores.TotalScore, 0),
            PenaltyTime = ISNULL(scores.TotalPenalty, 0)
        FROM dbo.Contest_User cu
        OUTER APPLY (
            SELECT 
                SUM(cp.MaxScore) AS TotalScore,
                SUM(cpr.SolveMinute + (cpr.WrongCount * 20)) AS TotalPenalty
            FROM dbo.ContestProblemResults cpr
            JOIN dbo.Contest_Problem cp ON cp.ContestID = cpr.ContestID AND cp.ProblemID = cpr.ProblemID
            WHERE cpr.ContestID = cu.ContestID AND cpr.UserID = cu.UserID AND cpr.Solved = 1
        ) scores
        WHERE cu.ContestID = @ContestID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO
