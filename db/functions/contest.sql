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

        IF EXISTS (
            SELECT 1 
            FROM dbo.Class_Student 
            WHERE ClassID = @ClassID AND UserID = @UserID
        )
            RETURN 1;

        IF EXISTS (
            SELECT 1
            FROM dbo.Class_TA
            WHERE ClassID = @ClassID AND UserID_TA = @UserID
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

CREATE OR ALTER FUNCTION app.ufn_CanUserAccessContestProblem
(
    @ContestID INT,
    @ProblemID INT,
    @UserID INT
)
RETURNS BIT
AS
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM dbo.Contest_Problem 
        WHERE ContestID = @ContestID AND ProblemID = @ProblemID
    )
        RETURN 0;

    DECLARE @Status VARCHAR(20), @ProblemStatus VARCHAR(20), @ProblemCreatorID INT, @ContestClassID INT;
    DECLARE @CreatorID INT;
    DECLARE @IsAdmin BIT = 0;

    IF EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID AND Role = 'Admin')
        SET @IsAdmin = 1;

    SELECT 
        @Status = app.ufn_GetContestStatus(StartTime, EndTime),
        @CreatorID = CreatorID,
        @ContestClassID = ClassID
    FROM dbo.Contests 
    WHERE ContestID = @ContestID;

    IF @Status IS NULL
        RETURN 0;

    SELECT @ProblemStatus = Status, @ProblemCreatorID = CreatorID
    FROM dbo.Problems
    WHERE ProblemID = @ProblemID;

    IF @ProblemStatus NOT IN ('Public', 'Private')
        RETURN 0;

    -- Bài Riêng tư chỉ vào được kỳ thi khi người thêm còn đủ quyền (kiểm tra ở usp_Contest_AddProblem);
    -- quyền xem sau đó không phụ thuộc vai trò hiện tại của người tạo kỳ thi.

    IF @Status = 'Upcoming' AND @CreatorID <> @UserID AND @IsAdmin = 0
        RETURN 0;

    -- Keep the existing read-only behavior for ended, open contests, but do not
    -- let that public archive path expose private problems to nonparticipants.
    IF @ProblemStatus = 'Public' AND @Status = 'Ended' AND @ContestClassID IS NULL
        RETURN 1;

    IF app.ufn_CanUserAccessContest(@ContestID, @UserID) = 1
        RETURN 1;

    RETURN 0;
END;
GO

-- Tỉ lệ (0..1) testcase đạt của một lần nộp, dùng để tính điểm kỳ thi.
-- Bài có chia nhóm điểm dùng Score/MaxScore; còn lại dùng số testcase đạt / tổng.
CREATE OR ALTER FUNCTION app.ufn_SubmissionRatio
(
    @Result VARCHAR(20),
    @Score INT,
    @MaxScore INT,
    @PassedCases VARCHAR(50)
)
RETURNS FLOAT
AS
BEGIN
    IF @Result = 'AC' RETURN 1.0;
    IF @Result NOT IN ('WA', 'TLE', 'MLE', 'RE') RETURN 0.0;

    IF @MaxScore IS NOT NULL AND @MaxScore > 0
        RETURN CASE WHEN ISNULL(@Score, 0) >= @MaxScore THEN 1.0 ELSE CAST(ISNULL(@Score, 0) AS FLOAT) / @MaxScore END;

    DECLARE @Slash INT = CHARINDEX('/', ISNULL(@PassedCases, ''));
    IF @Slash <= 1 RETURN 0.0;

    DECLARE @Passed INT = TRY_CAST(LEFT(@PassedCases, @Slash - 1) AS INT);
    DECLARE @Total INT = TRY_CAST(SUBSTRING(@PassedCases, @Slash + 1, 20) AS INT);
    IF @Passed IS NULL OR @Total IS NULL OR @Total <= 0 RETURN 0.0;

    RETURN CASE WHEN @Passed >= @Total THEN 1.0 ELSE CAST(@Passed AS FLOAT) / @Total END;
END;
GO
