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
      `);
  }

  await pool.close();
  console.log("seed done (password for all: Password@123)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
