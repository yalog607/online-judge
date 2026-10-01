CREATE OR ALTER FUNCTION dbo.udf_GetRemainingTime(@ContestID INT)
RETURNS INT
AS
BEGIN
    DECLARE @Remaining INT;
    SELECT @Remaining = DATEDIFF(MINUTE, SYSUTCDATETIME(), EndTime)
    FROM dbo.Contests
    WHERE ContestID = @ContestID;
    
    IF @Remaining < 0 SET @Remaining = 0;
    RETURN @Remaining;
END;
GO
