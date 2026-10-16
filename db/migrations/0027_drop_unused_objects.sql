-- Don dep doi tuong khong con noi nao dung: bang Reports, proc/ham/view mo coi, cot JudgeWorkers.JudgedCount.

IF OBJECT_ID(N'dbo.Reports', N'U') IS NOT NULL DROP TABLE dbo.Reports;
GO

IF OBJECT_ID(N'app.usp_Judge_ClaimNext', N'P') IS NOT NULL DROP PROCEDURE app.usp_Judge_ClaimNext;
IF OBJECT_ID(N'app.usp_Class_DowngradeFromTA', N'P') IS NOT NULL DROP PROCEDURE app.usp_Class_DowngradeFromTA;
IF OBJECT_ID(N'app.usp_Session_RevokeAllForUser', N'P') IS NOT NULL DROP PROCEDURE app.usp_Session_RevokeAllForUser;
IF OBJECT_ID(N'app.usp_Teacher_ListImpersonatableStudents', N'P') IS NOT NULL DROP PROCEDURE app.usp_Teacher_ListImpersonatableStudents;
GO

IF OBJECT_ID(N'dbo.udf_CalculatePenaltyTime') IS NOT NULL DROP FUNCTION dbo.udf_CalculatePenaltyTime;
IF OBJECT_ID(N'dbo.udf_GetProblemACRate') IS NOT NULL DROP FUNCTION dbo.udf_GetProblemACRate;
IF OBJECT_ID(N'dbo.udf_GetRemainingTime') IS NOT NULL DROP FUNCTION dbo.udf_GetRemainingTime;
IF OBJECT_ID(N'dbo.udf_GetTotalScore') IS NOT NULL DROP FUNCTION dbo.udf_GetTotalScore;
IF OBJECT_ID(N'dbo.udf_IsContestRunning') IS NOT NULL DROP FUNCTION dbo.udf_IsContestRunning;
IF OBJECT_ID(N'app.ufn_GetClassDocuments') IS NOT NULL DROP FUNCTION app.ufn_GetClassDocuments;
IF OBJECT_ID(N'app.ufn_GetClassStudentCount') IS NOT NULL DROP FUNCTION app.ufn_GetClassStudentCount;
IF OBJECT_ID(N'app.ufn_GetProblemAcRate') IS NOT NULL DROP FUNCTION app.ufn_GetProblemAcRate;
GO

IF OBJECT_ID(N'app.uvw_ClassDocumentOverview', N'V') IS NOT NULL DROP VIEW app.uvw_ClassDocumentOverview;
IF OBJECT_ID(N'dbo.vw_ContestStandings', N'V') IS NOT NULL DROP VIEW dbo.vw_ContestStandings;
IF OBJECT_ID(N'dbo.vw_RecentSubmissions', N'V') IS NOT NULL DROP VIEW dbo.vw_RecentSubmissions;
IF OBJECT_ID(N'dbo.vw_UserLeaderboard', N'V') IS NOT NULL DROP VIEW dbo.vw_UserLeaderboard;
IF OBJECT_ID(N'dbo.vw_UserSubmissionStats', N'V') IS NOT NULL DROP VIEW dbo.vw_UserSubmissionStats;
GO

IF COL_LENGTH(N'dbo.JudgeWorkers', N'JudgedCount') IS NOT NULL
BEGIN
    IF OBJECT_ID(N'dbo.DF_JW_Count', N'D') IS NOT NULL ALTER TABLE dbo.JudgeWorkers DROP CONSTRAINT DF_JW_Count;
    ALTER TABLE dbo.JudgeWorkers DROP COLUMN JudgedCount;
END
GO
