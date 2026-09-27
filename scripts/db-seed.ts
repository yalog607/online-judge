import "dotenv/config";
import bcrypt from "bcryptjs";
import sql from "mssql";
import { env } from "../src/lib/env";

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
