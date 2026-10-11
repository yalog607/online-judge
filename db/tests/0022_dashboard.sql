DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @Suffix VARCHAR(12) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 12);
DECLARE @TeacherID INT, @StudentID INT, @ClassID INT, @ProblemID INT;
DECLARE @UserSummary TABLE (
    ProblemsSolved INT, SolvedThisWeek INT, TotalSubmissions INT, TotalAC INT,
    CurrentStreak INT, LongestStreak INT, [Rank] INT NULL, RankedUsers INT, Today VARCHAR(10)
);
DECLARE @TeacherSummary TABLE (
    ClassCount INT, StudentCount INT, OpenProblems INT, ExpiringSoon INT,
    SubmissionsToday INT, SubmissionsYesterday INT,
    PendingClasses INT, PendingProblems INT, PendingTaRequests INT, Today VARCHAR(10)
);
DECLARE @AdminSummary TABLE (
    TotalUsers INT, NewUsersToday INT, Submissions24h INT, SubmissionsPrev24h INT,
    QueueCount INT, WorkersTotal INT, WorkersActive INT, Errors24h INT
);

-- Submissions không thể xóa, nên dựng dữ liệu trong transaction rồi rollback.
BEGIN TRANSACTION;

INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES ('dash_teacher_' + @Suffix, 'hash', 'dash_teacher_' + @Suffix + '@test.com', N'Dash Teacher', 'Teacher'),
       ('dash_student_' + @Suffix, 'hash', 'dash_student_' + @Suffix + '@test.com', N'Dash Student', 'User');
SELECT @TeacherID = MAX(CASE WHEN Username = 'dash_teacher_' + @Suffix THEN UserID END),
       @StudentID = MAX(CASE WHEN Username = 'dash_student_' + @Suffix THEN UserID END)
FROM dbo.Users;

INSERT dbo.Classes (TeacherID, InviteCode, ClassName, ApprovalStatus)
VALUES (@TeacherID, LEFT('D' + @Suffix, 20), N'Dash class ' + @Suffix, 'Approved');
SET @ClassID = SCOPE_IDENTITY();
INSERT dbo.Class_Student (ClassID, UserID, ProgressPercent) VALUES (@ClassID, @StudentID, 40);

INSERT dbo.Problems (CreatorID, Title, Statement, Difficulty, Status)
VALUES (@TeacherID, N'Dash problem ' + @Suffix, N'Test', 'Easy', 'Public');
SET @ProblemID = SCOPE_IDENTITY();
INSERT dbo.Class_Problem (ClassID, ProblemID) VALUES (@ClassID, @ProblemID);

-- Hôm nay: WA + AC; hôm qua: WA.
INSERT dbo.Submissions (UserID, ProblemID, SourceCode, Language, SubmitTime, Result)
VALUES (@StudentID, @ProblemID, N'x', 'cpp', DATEADD(MINUTE, -2, SYSUTCDATETIME()), 'WA'),
       (@StudentID, @ProblemID, N'x', 'cpp', DATEADD(MINUTE, -1, SYSUTCDATETIME()), 'AC'),
       (@StudentID, @ProblemID, N'x', 'cpp', DATEADD(DAY, -1, SYSUTCDATETIME()), 'WA');

INSERT @UserSummary EXEC app.usp_Dashboard_User @UserID = @StudentID, @SummaryOnly = 1;
INSERT @Results VALUES ('User dashboard counts solved problems and submissions',
    CASE WHEN EXISTS (SELECT 1 FROM @UserSummary WHERE ProblemsSolved = 1 AND TotalSubmissions = 3 AND TotalAC = 1) THEN 1 ELSE 0 END);
INSERT @Results VALUES ('User dashboard streak counts consecutive submission days',
    CASE WHEN EXISTS (SELECT 1 FROM @UserSummary WHERE CurrentStreak = 2 AND LongestStreak = 2) THEN 1 ELSE 0 END);
INSERT @Results VALUES ('User dashboard ranks a user who solved a problem',
    CASE WHEN EXISTS (SELECT 1 FROM @UserSummary WHERE [Rank] >= 1 AND RankedUsers >= 1) THEN 1 ELSE 0 END);

DELETE FROM @UserSummary;
INSERT @UserSummary EXEC app.usp_Dashboard_User @UserID = @TeacherID, @SummaryOnly = 1;
INSERT @Results VALUES ('User dashboard has no rank and zero streak without submissions',
    CASE WHEN EXISTS (SELECT 1 FROM @UserSummary WHERE ProblemsSolved = 0 AND [Rank] IS NULL AND CurrentStreak = 0) THEN 1 ELSE 0 END);

INSERT @TeacherSummary EXEC app.usp_Dashboard_Teacher @TeacherID = @TeacherID, @SummaryOnly = 1;
INSERT @Results VALUES ('Teacher dashboard counts classes, students and open problems',
    CASE WHEN EXISTS (SELECT 1 FROM @TeacherSummary WHERE ClassCount = 1 AND StudentCount = 1 AND OpenProblems = 1) THEN 1 ELSE 0 END);
INSERT @Results VALUES ('Teacher dashboard counts class submissions today and yesterday',
    CASE WHEN EXISTS (SELECT 1 FROM @TeacherSummary WHERE SubmissionsToday = 2 AND SubmissionsYesterday = 1) THEN 1 ELSE 0 END);

DELETE FROM @TeacherSummary;
INSERT @TeacherSummary EXEC app.usp_Dashboard_Teacher @TeacherID = @StudentID, @SummaryOnly = 1;
INSERT @Results VALUES ('Teacher dashboard is empty for a user without classes',
    CASE WHEN EXISTS (SELECT 1 FROM @TeacherSummary WHERE ClassCount = 0 AND SubmissionsToday = 0) THEN 1 ELSE 0 END);

INSERT @AdminSummary EXEC app.usp_Dashboard_Admin @SummaryOnly = 1;
INSERT @Results VALUES ('Admin dashboard counts users and recent submissions',
    CASE WHEN EXISTS (SELECT 1 FROM @AdminSummary WHERE TotalUsers >= 2 AND Submissions24h >= 3) THEN 1 ELSE 0 END);

ROLLBACK TRANSACTION;

SELECT Assertion, Passed FROM @Results;
