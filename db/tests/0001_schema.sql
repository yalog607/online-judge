DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

BEGIN TRY
    INSERT dbo.Users (Username, Password, Email, FullName) VALUES ('t_dup', 'x', 'dup@test.com', N'Dup');
    INSERT dbo.Users (Username, Password, Email, FullName) VALUES ('t_dup2', 'x', 'dup@test.com', N'Dup2');
    INSERT @Results VALUES ('unique email constraint blocks duplicate', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('unique email constraint blocks duplicate', 1);
END CATCH
DELETE dbo.Users WHERE Email = 'dup@test.com';

BEGIN TRY
    INSERT dbo.Contests (CreatorID, ContestName, StartTime, EndTime)
    SELECT TOP 1 UserID, N'Bad contest', '2026-01-02', '2026-01-01' FROM dbo.Users;
    INSERT @Results VALUES ('contest end time must be after start', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('contest end time must be after start', 1);
END CATCH

BEGIN TRY
    EXEC app.usp_System_Ping;
    INSERT @Results VALUES ('usp_System_Ping runs', 1);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('usp_System_Ping runs', 0);
END CATCH

SELECT Assertion, Passed FROM @Results;
