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
