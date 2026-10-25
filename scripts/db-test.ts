import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import sql from "mssql";
import { env } from "../src/lib/env";

const DIR = path.resolve(__dirname, "..", "db", "tests");

async function main() {
  const e = env();
  const pool = await new sql.ConnectionPool({
    server: e.DB_HOST,
    port: e.DB_PORT,
    database: e.DB_NAME,
    user: "sa",
    password: e.DB_SA_PASSWORD,
    options: { encrypt: true, trustServerCertificate: true },
  }).connect();

  const files = fs.existsSync(DIR)
    ? fs
        .readdirSync(DIR)
        .filter((f) => f.endsWith(".sql"))
        .sort()
    : [];

  // Trigger trg_Users_PreventDeleteAdmin chặn xóa Admin cuối cùng; trên DB mới (CI) chưa có Admin nào nên
  // nhiều test (tạo rồi xóa Admin tạm) sẽ lỗi. Tạo một Admin nền tảng không đăng nhập được, xóa lại khi xong.
  const BASELINE = "db_test_baseline_admin";
  const needBaseline =
    (await pool.request().query(`SELECT COUNT(*) AS n FROM dbo.Users WHERE Role = 'Admin'`)).recordset[0].n === 0;
  if (needBaseline) {
    await pool
      .request()
      .input("u", BASELINE)
      .query(
        `INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES (@u, 'x', @u + '@test.invalid', N'DB Test Baseline Admin', 'Admin')`,
      );
  }

  let failed = 0;  for (const file of files) {
    const script = fs.readFileSync(path.join(DIR, file), "utf8");
    try {
      const result = await pool.request().query(script);
      const failures = (result.recordset ?? []).filter((r) => r.Passed === 0);
      if (failures.length) {
        failed += failures.length;
        for (const f of failures) console.error(`FAIL ${file}: ${f.Assertion}`);
      } else {
        console.log(`PASS ${file}`);
      }
    } catch (err) {
      failed++;
      console.error(`ERROR ${file}:`, err);
    }
  }

  if (needBaseline) {
    await pool
      .request()
      .input("u", BASELINE)
      .query(
        `DISABLE TRIGGER dbo.trg_Users_PreventDeleteAdmin ON dbo.Users;
         BEGIN TRY DELETE FROM dbo.Users WHERE Username = @u; END TRY BEGIN CATCH END CATCH;
         ENABLE TRIGGER dbo.trg_Users_PreventDeleteAdmin ON dbo.Users;`,
      );
  }
  await pool.close();  if (failed) {
    console.error(`${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log("all db tests passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
