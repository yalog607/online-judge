DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
BEGIN TRANSACTION;
DECLARE @Sfx VARCHAR(8) = LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8);
DECLARE @TeacherID INT, @ClassID INT, @P1 INT, @P2 INT, @P3 INT, @FutureContest INT, @LiveContest INT;

INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES ('pd_t_' + @Sfx, 'hash', 'pd_t_' + @Sfx + '@test.com', N'PD Teacher', 'Teacher');
SET @TeacherID = SCOPE_IDENTITY();
INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus) VALUES (@TeacherID, 'PD' + @Sfx, N'PD Class', 1, 'Approved');
SET @ClassID = SCOPE_IDENTITY();

INSERT dbo.Problems (CreatorID, Title, Statement, Difficulty, Status) VALUES (@TeacherID, N'PD one ' + @Sfx, N'T', 'Easy', 'Public');
SET @P1 = SCOPE_IDENTITY();
INSERT dbo.Problems (CreatorID, Title, Statement, Difficulty, Status) VALUES (@TeacherID, N'PD two ' + @Sfx, N'T', 'Easy', 'Public');
SET @P2 = SCOPE_IDENTITY();
INSERT dbo.Problems (CreatorID, Title, Statement, Difficulty, Status) VALUES (@TeacherID, N'PD three ' + @Sfx, N'T', 'Easy', 'Public');
SET @P3 = SCOPE_IDENTITY();

INSERT dbo.Class_Problem (ClassID, ProblemID, AssignedDate, IsClosed) VALUES (@ClassID, @P1, SYSUTCDATETIME(), 0);
INSERT dbo.Contests (CreatorID, ContestName, StartTime, EndTime)
VALUES (@TeacherID, N'PD future ' + @Sfx, DATEADD(DAY, 1, SYSUTCDATETIME()), DATEADD(DAY, 2, SYSUTCDATETIME()));
SET @FutureContest = SCOPE_IDENTITY();
INSERT dbo.Contest_Problem (ContestID, ProblemID, MaxScore, OrderIndex) VALUES (@FutureContest, @P1, 100, 1);
INSERT dbo.Contests (CreatorID, ContestName, StartTime, EndTime)
VALUES (@TeacherID, N'PD live ' + @Sfx, DATEADD(HOUR, -1, SYSUTCDATETIME()), DATEADD(DAY, 1, SYSUTCDATETIME()));
SET @LiveContest = SCOPE_IDENTITY();
INSERT dbo.Contest_Problem (ContestID, ProblemID, MaxScore, OrderIndex) VALUES (@LiveContest, @P2, 100, 1);
INSERT dbo.Submissions (UserID, ProblemID, SourceCode, Language) VALUES (@TeacherID, @P3, 'x', 'python');

EXEC app.usp_Problem_Delete @ProblemID = @P1, @ActorID = @TeacherID;
INSERT @Results VALUES ('Problem assigned to a class and a future contest can be deleted',
    CASE WHEN NOT EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @P1)
          AND NOT EXISTS (SELECT 1 FROM dbo.Class_Problem WHERE ProblemID = @P1)
          AND NOT EXISTS (SELECT 1 FROM dbo.Contest_Problem WHERE ProblemID = @P1) THEN 1 ELSE 0 END);

BEGIN TRY
    EXEC app.usp_Problem_Delete @ProblemID = @P2, @ActorID = @TeacherID;
    INSERT @Results VALUES ('Problem used in a started contest cannot be deleted', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Problem used in a started contest cannot be deleted', CASE WHEN ERROR_NUMBER() = 50012 THEN 1 ELSE 0 END);
END CATCH;

BEGIN TRY
    EXEC app.usp_Problem_Delete @ProblemID = @P3, @ActorID = @TeacherID;
    INSERT @Results VALUES ('Problem with submissions cannot be deleted', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Problem with submissions cannot be deleted', CASE WHEN ERROR_NUMBER() = 50011 THEN 1 ELSE 0 END);
END CATCH;

IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
SELECT Assertion, Passed FROM @Results;
