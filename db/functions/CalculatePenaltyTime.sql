CREATE OR ALTER FUNCTION dbo.udf_CalculatePenaltyTime(
    @StartTime DATETIME2(0), 
    @SubmitTime DATETIME2(0), 
    @WrongCount INT
)
RETURNS INT
AS
BEGIN
    DECLARE @PenaltyMinutes INT;
    SET @PenaltyMinutes = DATEDIFF(MINUTE, @StartTime, @SubmitTime) + (@WrongCount * 20);
    RETURN @PenaltyMinutes;
END;
GO
