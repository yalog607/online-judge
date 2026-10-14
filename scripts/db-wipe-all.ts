import "dotenv/config";
import sql from "mssql";
import { env } from "../src/lib/env";

// XÓA SẠCH toàn bộ dữ liệu nghiệp vụ (user, bài, lớp, kỳ thi, bài nộp, bình luận...).
// Không xóa schema, stored procedure, trigger hay bảng JudgeWorkers.
// Bắt buộc: --yes và --confirm=<tên DB> trùng DB_NAME. Hãy backup trước (deploy/backup.sh).

const WIPE_SQL = `
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRAN;

DELETE FROM dbo.CommentLikes;
DELETE FROM dbo.CommentReports;
UPDATE dbo.Comments SET ParentID = NULL;
DELETE FROM dbo.Comments;
DELETE FROM dbo.ContestCommentLikes;
UPDATE dbo.ContestComments SET ParentID = NULL;
DELETE FROM dbo.ContestComments;

DELETE FROM dbo.Reports;
DELETE FROM dbo.SubmissionResults;
DISABLE TRIGGER trg_Submission_PreventDelete ON dbo.Submissions;
DELETE FROM dbo.Submissions;
ENABLE TRIGGER trg_Submission_PreventDelete ON dbo.Submissions;

DELETE FROM dbo.ContestProblemResults;
DELETE FROM dbo.Contest_User;
DELETE FROM dbo.Contest_Problem;
DELETE FROM dbo.Contests;

DELETE FROM dbo.Class_Problem;
DELETE FROM dbo.TA_Requests;
DELETE FROM dbo.Class_TA;
DELETE FROM dbo.Class_Student;
DELETE FROM dbo.Documents;
DELETE FROM dbo.Classes;

DELETE FROM dbo.Testcases;
DELETE FROM dbo.Problems;

DELETE FROM dbo.Notifications;
DELETE FROM dbo.OtpCodes;
DELETE FROM dbo.Sessions;
DELETE FROM dbo.Users;
DELETE FROM dbo.AuditLog;

-- Đặt lại IDENTITY để ID bắt đầu từ 1.
DBCC CHECKIDENT ('dbo.Users', RESEED, 0) WITH NO_INFOMSGS;
DBCC CHECKIDENT ('dbo.Classes', RESEED, 0) WITH NO_INFOMSGS;
DBCC CHECKIDENT ('dbo.Problems', RESEED, 0) WITH NO_INFOMSGS;
DBCC CHECKIDENT ('dbo.Testcases', RESEED, 0) WITH NO_INFOMSGS;
DBCC CHECKIDENT ('dbo.Contests', RESEED, 0) WITH NO_INFOMSGS;
DBCC CHECKIDENT ('dbo.Documents', RESEED, 0) WITH NO_INFOMSGS;
DBCC CHECKIDENT ('dbo.Submissions', RESEED, 0) WITH NO_INFOMSGS;
DBCC CHECKIDENT ('dbo.Comments', RESEED, 0) WITH NO_INFOMSGS;
DBCC CHECKIDENT ('dbo.ContestComments', RESEED, 0) WITH NO_INFOMSGS;
DBCC CHECKIDENT ('dbo.CommentReports', RESEED, 0) WITH NO_INFOMSGS;
DBCC CHECKIDENT ('dbo.Reports', RESEED, 0) WITH NO_INFOMSGS;
DBCC CHECKIDENT ('dbo.Notifications', RESEED, 0) WITH NO_INFOMSGS;
DBCC CHECKIDENT ('dbo.TA_Requests', RESEED, 0) WITH NO_INFOMSGS;
DBCC CHECKIDENT ('dbo.OtpCodes', RESEED, 0) WITH NO_INFOMSGS;
DBCC CHECKIDENT ('dbo.AuditLog', RESEED, 0) WITH NO_INFOMSGS;

COMMIT;
`;

async function main() {
  const e = env();
  const confirmArg = process.argv.find((a) => a.startsWith("--confirm="))?.slice("--confirm=".length);
  if (!process.argv.includes("--yes") || confirmArg !== e.DB_NAME) {
    console.error(`Từ chối chạy. Cần: --yes --confirm=${e.DB_NAME}`);
    process.exit(1);
  }
  const pool = await new sql.ConnectionPool({
    server: e.DB_HOST,
    port: e.DB_PORT,
    database: e.DB_NAME,
    user: "sa",
    password: e.DB_SA_PASSWORD,
    options: { encrypt: true, trustServerCertificate: true },
  }).connect();
  try {
    console.log(`Wiping ${e.DB_HOST}:${e.DB_PORT}/${e.DB_NAME} ...`);
    await pool.request().batch(WIPE_SQL);
    console.log("All business data removed.");
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
