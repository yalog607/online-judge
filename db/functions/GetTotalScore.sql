CREATE OR ALTER FUNCTION dbo.udf_GetTotalScore(@UserID INT)
RETURNS INT
AS
BEGIN
    DECLARE @Score INT;
    SELECT @Score = ISNULL(SUM(TotalScore), 0)
    FROM dbo.Contest_User
    WHERE UserID = @UserID;
    RETURN @Score;
END;
GO
