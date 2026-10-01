CREATE OR ALTER FUNCTION dbo.udf_GetProblemACRate(@ProblemID INT)
RETURNS DECIMAL(5, 2)
AS
BEGIN
    DECLARE @Total INT, @AC INT;
    SELECT @Total = COUNT(*) FROM dbo.Submissions WHERE ProblemID = @ProblemID;
    IF @Total = 0 RETURN 0;
    
    SELECT @AC = COUNT(*) FROM dbo.Submissions WHERE ProblemID = @ProblemID AND Result = 'AC';
    RETURN CAST((@AC * 100.0 / @Total) AS DECIMAL(5, 2));
END;
GO
