CREATE OR ALTER FUNCTION app.ufn_GetProblemAcRate
(
    @ProblemID INT
)
RETURNS FLOAT
AS
BEGIN
    DECLARE @Rate FLOAT = 0.0;
    DECLARE @TotalSubmissions INT = 0;
    DECLARE @TotalAc INT = 0;

    SELECT 
        @TotalSubmissions = COUNT(*),
        @TotalAc = SUM(CASE WHEN Result = 'AC' THEN 1 ELSE 0 END)
    FROM dbo.Submissions
    WHERE ProblemID = @ProblemID;

    IF @TotalSubmissions > 0
        SET @Rate = CAST(@TotalAc AS FLOAT) * 100.0 / CAST(@TotalSubmissions AS FLOAT);

    RETURN @Rate;
END;
GO

CREATE OR ALTER FUNCTION app.ufn_CanUserAccessProblem
(
    @ProblemID INT,
    @UserID INT
)
RETURNS BIT
AS
BEGIN
    DECLARE @CreatorID INT, @Status VARCHAR(20);
    SELECT @CreatorID = CreatorID, @Status = Status 
    FROM dbo.Problems 
    WHERE ProblemID = @ProblemID;

    IF @CreatorID IS NULL
        RETURN 0;

    IF EXISTS (
        SELECT 1 
        FROM dbo.Users 
        WHERE UserID = @UserID AND Role IN ('Admin', 'Teacher', 'TA')
    )
        RETURN 1;

    IF @CreatorID = @UserID
        RETURN 1;

    IF @Status = 'Hidden'
        RETURN 0;

    IF @Status = 'Public'
        RETURN 1;

    IF @Status = 'Private'
    BEGIN
        IF EXISTS (
            SELECT 1 
            FROM dbo.Class_Problem cp
            JOIN dbo.Class_Student cs ON cs.ClassID = cp.ClassID
            WHERE cp.ProblemID = @ProblemID AND cs.UserID = @UserID
        )
            RETURN 1;

        IF EXISTS (
            SELECT 1 
            FROM dbo.Class_Problem cp
            JOIN dbo.Classes c ON c.ClassID = cp.ClassID
            WHERE cp.ProblemID = @ProblemID AND c.TeacherID = @UserID
        )
            RETURN 1;

        IF EXISTS (
            SELECT 1 
            FROM dbo.Contest_Problem cp
            JOIN dbo.Contests ct ON ct.ContestID = cp.ContestID
            WHERE cp.ProblemID = @ProblemID 
              AND app.ufn_CanUserAccessContest(cp.ContestID, @UserID) = 1
              AND app.ufn_GetContestStatus(ct.StartTime, ct.EndTime) = 'Ongoing'
        )
            RETURN 1;
    END;

    RETURN 0;
END;
GO
