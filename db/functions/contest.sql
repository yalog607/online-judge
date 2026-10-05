CREATE OR ALTER FUNCTION app.ufn_GetContestStatus
(
    @StartTime DATETIME2(0),
    @EndTime DATETIME2(0)
)
RETURNS VARCHAR(20)
AS
BEGIN
    DECLARE @Now DATETIME2(0) = SYSUTCDATETIME();
    IF @Now < @StartTime
        RETURN 'Upcoming';
    IF @Now <= @EndTime
        RETURN 'Ongoing';
    RETURN 'Ended';
END;
GO

CREATE OR ALTER FUNCTION app.ufn_CanUserAccessContest
(
    @ContestID INT,
    @UserID INT
)
RETURNS BIT
AS
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM dbo.Users 
        WHERE UserID = @UserID AND Role = 'Admin'
    )
        RETURN 1;

    IF EXISTS (
        SELECT 1 
        FROM dbo.Contests 
        WHERE ContestID = @ContestID AND CreatorID = @UserID
    )
        RETURN 1;

    IF EXISTS (
        SELECT 1 
        FROM dbo.Contest_User 
        WHERE ContestID = @ContestID AND UserID = @UserID
    )
        RETURN 1;

    DECLARE @ClassID INT;
    SELECT @ClassID = ClassID FROM dbo.Contests WHERE ContestID = @ContestID;

    IF @ClassID IS NOT NULL
    BEGIN
        IF EXISTS (
            SELECT 1 
            FROM dbo.Classes 
            WHERE ClassID = @ClassID AND TeacherID = @UserID
        )
            RETURN 1;
    END;

    RETURN 0;
END;
GO

CREATE OR ALTER FUNCTION app.ufn_GetContestLeaderboard
(
    @ContestID INT
)
RETURNS TABLE
AS
RETURN
(
    SELECT 
        DENSE_RANK() OVER (ORDER BY cu.TotalScore DESC, cu.PenaltyTime ASC) AS [Rank],
        cu.UserID,
        u.Username,
        u.FullName,
        u.Avatar,
        cu.TotalScore,
        cu.PenaltyTime,
        COUNT(CASE WHEN cpr.Solved = 1 THEN 1 END) AS ProblemsSolved
    FROM dbo.Contest_User cu
    JOIN dbo.Users u ON u.UserID = cu.UserID
    LEFT JOIN dbo.ContestProblemResults cpr 
        ON cpr.ContestID = cu.ContestID AND cpr.UserID = cu.UserID
    WHERE cu.ContestID = @ContestID
    GROUP BY cu.ContestID, cu.UserID, u.Username, u.FullName, u.Avatar, cu.TotalScore, cu.PenaltyTime
);
GO
