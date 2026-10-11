import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import sql from "mssql";
import { env } from "../src/lib/env";

const ROOT = path.resolve(__dirname, "..", "db");
const OBJECT_DIRS = ["functions", "views", "procs", "triggers"];

function batches(script: string): string[] {
  return script
    .split(/^\s*GO\s*$/gim)
    .map((b) => b.trim())
    .filter(Boolean);
}

function files(dir: string): string[] {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => path.join(full, f));
}

async function runScript(pool: sql.ConnectionPool, file: string) {
  for (const batch of batches(fs.readFileSync(file, "utf8"))) {
    await pool.request().batch(batch);
  }
}

async function connect(database: string, retries = 10, delayMs = 2000): Promise<sql.ConnectionPool> {
  const e = env();
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await new sql.ConnectionPool({
        server: e.DB_HOST,
        port: e.DB_PORT,
        database,
        user: "sa",
        password: e.DB_SA_PASSWORD,
        options: { encrypt: true, trustServerCertificate: true },
        requestTimeout: 120000,
      }).connect();
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`Waiting for SQL Server to be ready (attempt ${attempt}/${retries})...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("Failed to connect to database");
}

async function ensureDatabase() {
  const e = env();
  const master = await connect("master");
  await master
    .request()
    .input("name", e.DB_NAME)
    .query(`IF DB_ID(@name) IS NULL EXEC('CREATE DATABASE [' + @name + ']')`);
  await master.close();
}

async function ensureAppLogin(pool: sql.ConnectionPool) {
  const e = env();
  const user = e.DB_APP_USER.replace(/[^\w]/g, "");
  await pool.request().batch(`
    USE master;
    IF SUSER_ID('${user}') IS NULL
      CREATE LOGIN [${user}] WITH PASSWORD = '${e.DB_APP_PASSWORD.replace(/'/g, "''")}', CHECK_POLICY = OFF;
    USE [${e.DB_NAME}];
    IF USER_ID('${user}') IS NULL CREATE USER [${user}] FOR LOGIN [${user}];
    IF IS_ROLEMEMBER('app_executor', '${user}') <> 1 ALTER ROLE app_executor ADD MEMBER [${user}];
  `);
}

async function main() {
  await ensureDatabase();
  const pool = await connect(env().DB_NAME);

  await pool.request().batch(`
    IF OBJECT_ID('dbo.SchemaVersion') IS NULL
      CREATE TABLE dbo.SchemaVersion (
        Name NVARCHAR(200) NOT NULL PRIMARY KEY,
        AppliedAt DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME()
      )`);

  const applied = new Set(
    (await pool.request().query("SELECT Name FROM dbo.SchemaVersion")).recordset.map((r) => r.Name),
  );

  for (const file of files("migrations")) {
    const name = path.basename(file);
    if (applied.has(name)) continue;
    console.log(`migrate ${name}`);
    await runScript(pool, file);
    await pool.request().input("n", name).query("INSERT dbo.SchemaVersion (Name) VALUES (@n)");
  }

  for (const dir of OBJECT_DIRS) {
    for (const file of files(dir)) {
      console.log(`apply ${dir}/${path.basename(file)}`);
      await runScript(pool, file);
    }
  }

  await ensureAppLogin(pool);
  await pool.close();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
