import "dotenv/config";
import bcrypt from "bcryptjs";
import sql from "mssql";
import { env } from "../src/lib/env";

async function connect(retries = 10, delayMs = 2000): Promise<sql.ConnectionPool> {
  const e = env();
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await new sql.ConnectionPool({
        server: e.DB_HOST,
        port: e.DB_PORT,
        database: e.DB_NAME,
        user: "sa",
        password: e.DB_SA_PASSWORD,
        options: { encrypt: true, trustServerCertificate: true },
      }).connect();
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`Waiting for SQL Server to be ready (attempt ${attempt}/${retries})...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("Failed to connect to database");
}

async function main() {
  const pool = await connect();

  const users = [
    { username: "admin", email: "admin@itoj.local", fullName: "Trần Quản Trị", role: "Admin" },
    {
      username: "teacher1",
      email: "teacher1@itoj.local",
      fullName: "Lê Hoàng Nam",
      role: "Teacher",
    },
    { username: "user1", email: "user1@itoj.local", fullName: "Nguyễn Minh Anh", role: "User" },
    { username: "ta1", email: "ta1@itoj.local", fullName: "Phạm Trợ Giảng", role: "TA" },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash("Password@123", 10);
    await pool
      .request()
      .input("username", u.username)
      .input("password", hash)
      .input("email", u.email)
      .input("fullName", u.fullName)
      .input("role", u.role).query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = @email)
          INSERT dbo.Users (Username, Password, Email, FullName, Role)
          VALUES (@username, @password, @email, @fullName, @role)
        ELSE
          UPDATE dbo.Users SET Role = @role WHERE Email = @email;
      `);
  }

  const taRes = await pool
    .request()
    .query(`SELECT UserID FROM dbo.Users WHERE Email = 'ta1@itoj.local'`);
  const taUserId = taRes.recordset[0]?.UserID;

  const classRes = await pool
    .request()
    .query(`SELECT TOP 1 ClassID FROM dbo.Classes WHERE IsCancelled = 0 ORDER BY ClassID ASC`);
  const targetClassId = classRes.recordset[0]?.ClassID;

  if (taUserId && targetClassId) {
    await pool
      .request()
      .input("classId", targetClassId)
      .input("taUserId", taUserId)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = @classId AND UserID_TA = @taUserId)
          INSERT dbo.Class_TA (ClassID, UserID_TA)
          VALUES (@classId, @taUserId);
        DELETE FROM dbo.Class_Student WHERE ClassID = @classId AND UserID = @taUserId;
      `);
  }

  await pool.close();
  console.log("seed done (password for all: Password@123)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
