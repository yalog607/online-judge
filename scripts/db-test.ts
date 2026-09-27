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

  let failed = 0;
  for (const file of files) {
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

  await pool.close();
  if (failed) {
    console.error(`${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log("all db tests passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
