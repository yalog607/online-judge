CREATE OR ALTER FUNCTION dbo.udf_IsContestRunning(@ContestID INT)
RETURNS BIT
AS
BEGIN
    DECLARE @IsRunning BIT = 0;
    IF EXISTS (
        SELECT 1 FROM dbo.Contests 
        WHERE ContestID = @ContestID 
        AND StartTime <= SYSUTCDATETIME() 
        AND EndTime >= SYSUTCDATETIME()
    )
        SET @IsRunning = 1;
    RETURN @IsRunning;
END;
GO
