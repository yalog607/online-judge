import "dotenv/config";
import sql from "mssql";
import { env } from "../src/lib/env";

// Xóa dữ liệu do db-seed-sample.ts tạo: user `sample_*` và mọi thứ gắn với họ
// (bài tập, lớp, kỳ thi, bài nộp, bình luận, thông báo...).
// Mặc định chỉ thống kê (dry-run); thêm --yes để xóa thật.
// Trigger chặn xóa bài nộp được tắt tạm trong đúng transaction này rồi bật lại.

const CLEAN_SQL = `
SET NOCOUNT ON;
SET XACT_ABORT ON;

CREATE TABLE #U (UserID INT PRIMARY KEY);
CREATE TABLE #P (ProblemID INT PRIMARY KEY);
CREATE TABLE #C (ContestID INT PRIMARY KEY);
CREATE TABLE #K (ClassID INT PRIMARY KEY);
CREATE TABLE #S (SubmissionID INT PRIMARY KEY);
CREATE TABLE #M (CommentID INT PRIMARY KEY);

INSERT #U SELECT UserID FROM dbo.Users WHERE Username LIKE 'sample[_]%';
INSERT #P SELECT ProblemID FROM dbo.Problems WHERE CreatorID IN (SELECT UserID FROM #U);
INSERT #C SELECT ContestID FROM dbo.Contests WHERE CreatorID IN (SELECT UserID FROM #U);
INSERT #K SELECT ClassID FROM dbo.Classes WHERE TeacherID IN (SELECT UserID FROM #U);
INSERT #S SELECT SubmissionID FROM dbo.Submissions
  WHERE UserID IN (SELECT UserID FROM #U) OR ProblemID IN (SELECT ProblemID FROM #P) OR ContestID IN (SELECT ContestID FROM #C);
INSERT #M SELECT CommentID FROM dbo.Comments
  WHERE UserID IN (SELECT UserID FROM #U) OR ProblemID IN (SELECT ProblemID FROM #P) OR ContestID IN (SELECT ContestID FROM #C);

IF @dryRun = 1
BEGIN
  SELECT
    (SELECT COUNT(*) FROM #U) AS users,
    (SELECT COUNT(*) FROM #P) AS problems,
    (SELECT COUNT(*) FROM #K) AS classes,
    (SELECT COUNT(*) FROM #C) AS contests,
    (SELECT COUNT(*) FROM #S) AS submissions,
    (SELECT COUNT(*) FROM #M) AS comments;
  RETURN;
END;

BEGIN TRAN;

-- Bình luận
UPDATE dbo.Comments SET ParentID = NULL
  WHERE ParentID IN (SELECT CommentID FROM #M) AND CommentID NOT IN (SELECT CommentID FROM #M);
DELETE FROM dbo.CommentLikes WHERE UserID IN (SELECT UserID FROM #U) OR CommentID IN (SELECT CommentID FROM #M);
UPDATE dbo.Comments SET ParentID = NULL WHERE CommentID IN (SELECT CommentID FROM #M);
DELETE FROM dbo.Comments WHERE CommentID IN (SELECT CommentID FROM #M);

-- Bài nộp (tắt trigger chặn xóa trong transaction này)
DELETE FROM dbo.SubmissionResults WHERE SubmissionID IN (SELECT SubmissionID FROM #S);
DISABLE TRIGGER trg_Submission_PreventDelete ON dbo.Submissions;
DELETE FROM dbo.Submissions WHERE SubmissionID IN (SELECT SubmissionID FROM #S);
ENABLE TRIGGER trg_Submission_PreventDelete ON dbo.Submissions;

-- Kỳ thi
DELETE FROM dbo.ContestProblemResults
  WHERE ContestID IN (SELECT ContestID FROM #C) OR ProblemID IN (SELECT ProblemID FROM #P) OR UserID IN (SELECT UserID FROM #U);
DELETE FROM dbo.Contest_User WHERE ContestID IN (SELECT ContestID FROM #C) OR UserID IN (SELECT UserID FROM #U);
DELETE FROM dbo.Contest_Problem WHERE ContestID IN (SELECT ContestID FROM #C) OR ProblemID IN (SELECT ProblemID FROM #P);
DELETE FROM dbo.Contests WHERE ContestID IN (SELECT ContestID FROM #C);

-- Lớp học
DELETE FROM dbo.Class_Problem WHERE ClassID IN (SELECT ClassID FROM #K) OR ProblemID IN (SELECT ProblemID FROM #P);
DELETE FROM dbo.TA_Requests
  WHERE ClassID IN (SELECT ClassID FROM #K) OR UserID IN (SELECT UserID FROM #U) OR RequestedBy IN (SELECT UserID FROM #U);
DELETE FROM dbo.Class_TA WHERE ClassID IN (SELECT ClassID FROM #K) OR UserID_TA IN (SELECT UserID FROM #U);
DELETE FROM dbo.Class_Student WHERE ClassID IN (SELECT ClassID FROM #K) OR UserID IN (SELECT UserID FROM #U);
DELETE FROM dbo.Documents WHERE ClassID IN (SELECT ClassID FROM #K);
DELETE FROM dbo.Classes WHERE ClassID IN (SELECT ClassID FROM #K);

-- Bài tập (testcase xóa theo cascade)
DELETE FROM dbo.Problems WHERE ProblemID IN (SELECT ProblemID FROM #P);

-- Người dùng
DELETE FROM dbo.Notifications WHERE UserID IN (SELECT UserID FROM #U);
DELETE FROM dbo.Sessions WHERE UserID IN (SELECT UserID FROM #U);
DELETE FROM dbo.AuditLog WHERE ActorID IN (SELECT UserID FROM #U);
DELETE FROM dbo.Users WHERE UserID IN (SELECT UserID FROM #U);

COMMIT;

SELECT 'done' AS status;
`;

async function main() {
  const execute = process.argv.includes("--yes");
  const e = env();
  const pool = await new sql.ConnectionPool({
    server: e.DB_HOST,
    port: e.DB_PORT,
    database: e.DB_NAME,
    user: "sa",
    password: e.DB_SA_PASSWORD,
    options: { encrypt: true, trustServerCertificate: true },
  }).connect();

  try {
    console.log(`Target: ${e.DB_HOST}:${e.DB_PORT}/${e.DB_NAME}`);
    const r = pool.request();
    const res = await r.batch(`DECLARE @dryRun BIT = ${execute ? 0 : 1};\n${CLEAN_SQL}`);
    if (execute) {
      console.log("Sample data removed.");
    } else {
      console.log("Dry run — would remove:");
      console.table(res.recordset);
      console.log("Chạy lại với --yes để xóa thật: npm run db:clean:sample -- --yes");
    }
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
