import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import sql from "mssql";
import { env } from "../src/lib/env";
import { validateFunctionTestcase, type FunctionSpec } from "../src/modules/problem/function-spec";

// Nạp dữ liệu số lượng lớn (mặc định ~1000 người dùng) cho môi trường production/staging.
//   SEED_PASSWORD='...' npx tsx scripts/db-seed-bulk.ts            -> chỉ in kế hoạch (dry run)
//   SEED_PASSWORD='...' npx tsx scripts/db-seed-bulk.ts --yes      -> ghi vào DB (một transaction)
// Tuỳ chọn: --users=1000 --problems=120 --contests=25 --submissions=1500
// Tất cả tài khoản có username `sample_*` nên `npm run db:clean:sample -- --yes` xoá được toàn bộ.
// Idempotent: chạy lại không nhân đôi dữ liệu. Không tạo tài khoản Admin (dùng admin đã có). Mã mời lớp dễ đoán (BLK####):
// đây là dữ liệu mẫu, xoá bằng db:clean:sample ngay sau khi dùng xong.
// Mật khẩu không nằm trong source: truyền qua SEED_PASSWORD.

const PASSWORD = process.env.SEED_PASSWORD ?? "";
if (PASSWORD.length < 8) {
  console.error("Thiếu SEED_PASSWORD (tối thiểu 8 ký tự). Ví dụ: SEED_PASSWORD='...' npx tsx scripts/db-seed-bulk.ts --yes");
  process.exit(1);
}

// Mật khẩu kỳ thi lưu dạng plaintext trong DB nên không dùng lại SEED_PASSWORD (mật khẩu đăng nhập).
const CONTEST_PASSWORD = process.env.SEED_CONTEST_PASSWORD || randomBytes(5).toString("hex");

const args = process.argv.slice(2);
const APPLY = args.includes("--yes");
function num(name: string, fallback: number): number {
  const raw = args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  const n = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    console.error(`Tham số --${name} phải là số nguyên không âm.`);
    process.exit(1);
  }
  return n;
}
const USERS = num("users", 1000);
const PROBLEMS = num("problems", 120);
const CONTESTS = num("contests", 25);
const SUBMISSIONS = num("submissions", 1500);

const pad = (n: number, w: number) => String(n).padStart(w, "0");

// PRNG xác định (mulberry32) để mỗi lần chạy sinh cùng một bộ dữ liệu.
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261025);
const ri = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];

// ---------------------------------------------------------------- người dùng
const HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const DEM = ["Văn", "Thị", "Minh", "Quốc", "Thanh", "Ngọc", "Hoài", "Gia", "Anh", "Đức", "Khánh", "Bảo", "Hữu", "Tuấn"];
const TEN = ["An", "Bình", "Chi", "Dũng", "Giang", "Hà", "Hùng", "Khoa", "Lan", "Linh", "Nam", "Phúc", "Quân", "Sơn", "Thảo", "Trang", "Vy", "Yến", "Nhân", "Tiến"];
const fullName = () => `${pick(HO)} ${pick(DEM)} ${pick(TEN)}`;

type Role = "Admin" | "Teacher" | "TA" | "User";
type UserDef = { username: string; fullName: string; role: Role };

function buildUsers(): UserDef[] {
  const teachers = Math.max(1, Math.round(USERS * 0.03));
  const tas = Math.max(1, Math.round(USERS * 0.06));
  const students = Math.max(0, USERS - teachers - tas);
  const out: UserDef[] = [];
  for (let i = 1; i <= teachers; i++) out.push({ username: `sample_t${pad(i, 3)}`, fullName: fullName(), role: "Teacher" });
  for (let i = 1; i <= tas; i++) out.push({ username: `sample_ta${pad(i, 3)}`, fullName: fullName(), role: "TA" });
  for (let i = 1; i <= students; i++) out.push({ username: `sample_s${pad(i, 4)}`, fullName: fullName(), role: "User" });
  return out;
}

// ---------------------------------------------------------------- bài tập
type Testcase = { input: string[]; expected: string; hidden: boolean };
type ProblemDef = {
  key: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  spec: FunctionSpec;
  testcases: Testcase[];
  ok: string;
  status: "Public" | "Private" | "Hidden" | "Pending";
};

const arr = (len: number, lo: number, hi: number) => Array.from({ length: len }, () => ri(lo, hi));
const WORDS = ["algorithm", "banana", "competition", "judge", "internet", "function", "student", "sandbox", "queue", "binary"];

function tests(inputs: string[][], solve: (values: unknown[]) => unknown): Testcase[] {
  return inputs.map((input, i) => ({ input, expected: JSON.stringify(solve(input.map((v) => JSON.parse(v)))), hidden: i >= 2 }));
}

type Template = (k: number) => Omit<ProblemDef, "key" | "status">;
const templates: Template[] = [
  (k) => ({
    title: `Cộng với ${k}`, difficulty: "Easy", tags: "math,basic",
    statement: `Viết hàm \`addK(n)\` trả về \`n + ${k}\`.`, inputFormat: "Một số nguyên n (|n| ≤ 10^9).", outputFormat: `Giá trị n + ${k}.`,
    spec: { name: "addK", params: [{ name: "n", type: "int" }], returns: "long" },
    testcases: tests([[`${ri(1, 50)}`], ["0"], ["-100"], ["1000000000"], [`${ri(-9999, 9999)}`]], ([n]) => (n as number) + k),
    ok: `def addK(n):\n    return n + ${k}\n`,
  }),
  (k) => ({
    title: `Nhân với ${k}`, difficulty: "Easy", tags: "math,basic",
    statement: `Viết hàm \`mulK(n)\` trả về \`n * ${k}\`.`, inputFormat: "Một số nguyên n (|n| ≤ 10^6).", outputFormat: `Giá trị n * ${k}.`,
    spec: { name: "mulK", params: [{ name: "n", type: "int" }], returns: "long" },
    testcases: tests([["3"], ["-4"], ["0"], ["1000000"], [`${ri(-5000, 5000)}`]], ([n]) => (n as number) * k),
    ok: `def mulK(n):\n    return n * ${k}\n`,
  }),
  (k) => ({
    title: `Chia hết cho ${k}`, difficulty: "Easy", tags: "math",
    statement: `Viết hàm \`divisible(n)\` trả về \`true\` nếu \`n\` chia hết cho ${k}.`, inputFormat: "Một số nguyên n (|n| ≤ 10^9).", outputFormat: "true hoặc false.",
    spec: { name: "divisible", params: [{ name: "n", type: "int" }], returns: "bool" },
    testcases: tests([[`${k * 3}`], [`${k * 3 + 1}`], ["0"], ["-" + k * 5], [`${ri(1, 100000)}`]], ([n]) => (n as number) % k === 0),
    ok: `def divisible(n):\n    return n % ${k} == 0\n`,
  }),
  (k) => ({
    title: `Tổng phần tử lớn hơn ${k}`, difficulty: "Easy", tags: "array",
    statement: `Cho mảng \`nums\`. Viết hàm \`sumAbove(nums)\` trả về tổng các phần tử lớn hơn ${k}.`, inputFormat: "Mảng nums (độ dài ≤ 10^5).", outputFormat: "Tổng các phần tử thoả mãn (0 nếu không có).",
    spec: { name: "sumAbove", params: [{ name: "nums", type: "int[]" }], returns: "long" },
    testcases: tests([[JSON.stringify(arr(6, 0, 30))], [JSON.stringify([k])], [JSON.stringify(arr(10, -20, 40))], [JSON.stringify(arr(50, -100, 100))], [JSON.stringify(arr(8, 0, 9))]], ([a]) => (a as number[]).filter((x) => x > k).reduce((s, x) => s + x, 0)),
    ok: `def sumAbove(nums):\n    return sum(x for x in nums if x > ${k})\n`,
  }),
  (k) => ({
    title: `Đếm phần tử bằng ${k}`, difficulty: "Easy", tags: "array",
    statement: `Viết hàm \`countEqual(nums)\` trả về số phần tử của \`nums\` bằng ${k}.`, inputFormat: "Mảng nums (độ dài ≤ 10^5).", outputFormat: "Số lượng phần tử bằng giá trị cần đếm.",
    spec: { name: "countEqual", params: [{ name: "nums", type: "int[]" }], returns: "int" },
    testcases: tests([[JSON.stringify([k, 1, k])], [JSON.stringify([0])], [JSON.stringify(arr(20, 0, k + 3))], [JSON.stringify(arr(40, 0, k + 1))], [JSON.stringify([k, k, k, k])]], ([a]) => (a as number[]).filter((x) => x === k).length),
    ok: `def countEqual(nums):\n    return sum(1 for x in nums if x == ${k})\n`,
  }),
  (k) => ({
    title: `Giá trị lớn nhất cộng ${k}`, difficulty: "Easy", tags: "array",
    statement: `Viết hàm \`maxPlus(nums)\` trả về giá trị lớn nhất của mảng cộng thêm ${k}.`, inputFormat: "Mảng nums (1 ≤ độ dài ≤ 10^5).", outputFormat: `max(nums) + ${k}.`,
    spec: { name: "maxPlus", params: [{ name: "nums", type: "int[]" }], returns: "long" },
    testcases: tests([[JSON.stringify([5])], [JSON.stringify([-3, -1, -2])], [JSON.stringify(arr(12, -50, 50))], [JSON.stringify(arr(30, 0, 1000))], [JSON.stringify([2, 2, 2])]], ([a]) => Math.max(...(a as number[])) + k),
    ok: `def maxPlus(nums):\n    return max(nums) + ${k}\n`,
  }),
  (k) => ({
    title: `Lặp chuỗi ${(k % 4) + 2} lần`, difficulty: "Easy", tags: "string",
    statement: `Viết hàm \`repeatString(s)\` trả về chuỗi \`s\` được lặp lại ${(k % 4) + 2} lần liên tiếp.`, inputFormat: "Chuỗi s (độ dài ≤ 100).", outputFormat: "Chuỗi sau khi lặp.",
    spec: { name: "repeatString", params: [{ name: "s", type: "string" }], returns: "string" },
    testcases: tests([['"ab"'], ['"x"'], [JSON.stringify(pick(WORDS))], [JSON.stringify(pick(WORDS))], ['""']], ([s]) => (s as string).repeat((k % 4) + 2)),
    ok: `def repeatString(s):\n    return s * ${(k % 4) + 2}\n`,
  }),
  (k) => {
    const ch = "abcdefghijklmnopqrstuvwxyz"[k % 26];
    return {
      title: `Đếm ký tự '${ch}'`, difficulty: "Medium", tags: "string",
      statement: `Viết hàm \`countChar(s)\` trả về số lần ký tự '${ch}' xuất hiện trong \`s\`.`, inputFormat: "Chuỗi s gồm chữ cái thường (độ dài ≤ 1000).", outputFormat: "Số lần xuất hiện.",
      spec: { name: "countChar", params: [{ name: "s", type: "string" }], returns: "int" },
      testcases: tests([[JSON.stringify(ch + ch + "z")], ['"hello"'], [JSON.stringify(pick(WORDS))], [JSON.stringify(pick(WORDS) + pick(WORDS))], ['""']], ([s]) => (s as string).split(ch).length - 1),
      ok: `def countChar(s):\n    return s.count("${ch}")\n`,
    };
  },
  (k) => ({
    title: `Tổng k phần tử đầu (k = ${k % 5 + 1})`, difficulty: "Medium", tags: "array",
    statement: `Viết hàm \`sumFirst(nums)\` trả về tổng ${k % 5 + 1} phần tử đầu tiên của mảng (hoặc toàn bộ nếu mảng ngắn hơn).`, inputFormat: "Mảng nums (độ dài ≤ 10^5).", outputFormat: "Tổng tương ứng.",
    spec: { name: "sumFirst", params: [{ name: "nums", type: "int[]" }], returns: "long" },
    testcases: tests([[JSON.stringify([1, 2, 3, 4, 5, 6])], [JSON.stringify([9])], [JSON.stringify(arr(10, -9, 9))], [JSON.stringify(arr(3, 0, 100))], [JSON.stringify(arr(25, -50, 50))]], ([a]) => (a as number[]).slice(0, k % 5 + 1).reduce((s, x) => s + x, 0)),
    ok: `def sumFirst(nums):\n    return sum(nums[:${k % 5 + 1}])\n`,
  }),
  (k) => ({
    title: `Số cặp có tổng ${k + 5}`, difficulty: "Hard", tags: "array,hash",
    statement: `Cho mảng \`nums\`. Viết hàm \`countPairs(nums)\` đếm số cặp chỉ số i < j sao cho nums[i] + nums[j] = ${k + 5}.`, inputFormat: "Mảng nums (độ dài ≤ 2000).", outputFormat: "Số cặp thoả mãn.",
    spec: { name: "countPairs", params: [{ name: "nums", type: "int[]" }], returns: "int" },
    testcases: tests([[JSON.stringify([1, k + 4, 2, k + 3])], [JSON.stringify([0])], [JSON.stringify(arr(15, 0, k + 5))], [JSON.stringify(arr(40, 0, k + 5))], [JSON.stringify(arr(80, -5, k + 10))]], ([a]) => {
      const nums = a as number[];
      let c = 0;
      for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) if (nums[i] + nums[j] === k + 5) c++;
      return c;
    }),
    ok: `def countPairs(nums):\n    c = 0\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] + nums[j] == ${k + 5}:\n                c += 1\n    return c\n`,
  }),
];

function buildProblems(): ProblemDef[] {
  const out: ProblemDef[] = [];
  for (let i = 0; i < PROBLEMS; i++) {
    const tpl = templates[i % templates.length];
    const k = 2 + Math.floor(i / templates.length) + (i % templates.length);
    const base = tpl(k);
    // 70% Public, còn lại Private/Hidden/Pending để các màn hình quản lý có đủ trạng thái.
    const status = i % 10 < 7 ? "Public" : i % 10 === 7 ? "Private" : i % 10 === 8 ? "Hidden" : "Pending";
    out.push({ ...base, key: `P${pad(i + 1, 4)}`, title: `[Mẫu] ${base.title}`, status });
  }
  // Tiêu đề phải khác nhau để tra cứu theo (CreatorID, Title) không đè nhau.
  const seen = new Set<string>();
  for (const p of out) {
    while (seen.has(p.title)) p.title += "*";
    seen.add(p.title);
  }
  return out;
}

function validateProblems(list: ProblemDef[]) {
  for (const p of list) {
    for (const [i, tc] of p.testcases.entries()) {
      const err = validateFunctionTestcase(p.spec, tc.input.join("\n"), tc.expected);
      if (err) throw new Error(`Testcase #${i + 1} của "${p.title}" không hợp lệ: ${err}`);
    }
  }
}

// ---------------------------------------------------------------- kế hoạch dữ liệu
const SUBJECTS = ["Nhập môn lập trình", "Cấu trúc dữ liệu", "Giải thuật", "Lập trình hướng đối tượng", "Cơ sở dữ liệu", "Lập trình Python", "Toán rời rạc", "Kỹ thuật lập trình"];
type ClassDef = { code: string; name: string; isPublic: boolean; approval: "Approved" | "Pending" | "Rejected"; cancelled: boolean };
type ContestDef = { name: string; start: number; end: number; protectedByPassword: boolean };

function buildClasses(): ClassDef[] {
  const count = Math.max(1, Math.round(USERS / 25));
  return Array.from({ length: count }, (_, i) => ({
    code: `BLK${pad(i + 1, 4)}`,
    name: `${SUBJECTS[i % SUBJECTS.length]} - Nhóm ${pad(Math.floor(i / SUBJECTS.length) + 1, 2)}`,
    isPublic: i % 3 !== 0,
    approval: i % 10 === 9 ? "Pending" : i % 17 === 16 ? "Rejected" : "Approved",
    cancelled: i % 23 === 22,
  }));
}

function buildContests(): ContestDef[] {
  return Array.from({ length: CONTESTS }, (_, i) => {
    const slot = i % 10;
    const duration = pick([90, 120, 150, 180]);
    // 60% đã kết thúc, 10% đang diễn ra, 30% sắp diễn ra.
    const start = slot < 6 ? -ri(2, 60) * 24 * 60 : slot === 6 ? -30 : ri(1, 20) * 24 * 60;
    return { name: `[Mẫu] Kỳ thi số ${pad(i + 1, 3)}`, start, end: start + (slot === 6 ? 120 : duration), protectedByPassword: i % 4 === 3 };
  });
}

type Verdict = "AC" | "WA" | "TLE" | "RE" | "CE";
type Sub = { student: number; problem: string; verdict: Verdict; contest: number | null; at: number };
const FAILS: Verdict[] = ["WA", "WA", "WA", "TLE", "RE", "CE"];

// ---------------------------------------------------------------- ghi DB
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
  const users = buildUsers();
  const problems = buildProblems();
  validateProblems(problems);
  const classes = buildClasses();
  const contests = buildContests();
  const byRole = (r: Role) => users.filter((u) => u.role === r);

  console.log("Kế hoạch nạp dữ liệu (tài khoản sample_*, mật khẩu = SEED_PASSWORD):");
  console.log(`  Người dùng : ${users.length} (Admin ${byRole("Admin").length}, Teacher ${byRole("Teacher").length}, TA ${byRole("TA").length}, User ${byRole("User").length})`);
  console.log(`  Lớp học    : ${classes.length}`);
  console.log(`  Bài tập    : ${problems.length} (mỗi bài 5 testcase, đã kiểm tra hợp lệ)`);
  console.log(`  Kỳ thi     : ${contests.length}`);
  console.log(`  Bài nộp    : ~${SUBMISSIONS}`);
  if (!APPLY) {
    console.log("\nDry run: chưa ghi gì vào DB. Thêm --yes để ghi. Nhớ chạy deploy/backup.sh trước khi nạp vào production.");
    return;
  }

  const pool = await connect();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  async function q<T = Record<string, unknown>>(text: string, params: Record<string, unknown> = {}): Promise<T[]> {
    const r = tx.request();
    for (const [k, v] of Object.entries(params)) r.input(k, v as never);
    return (await r.query(text)).recordset as T[];
  }
  const scalar = async (text: string, params: Record<string, unknown> = {}) => {
    const rows = await q<Record<string, number>>(text, params);
    return rows.length ? Object.values(rows[0])[0] : undefined;
  };

  try {
    // ---- Users ----
    const hash = await bcrypt.hash(PASSWORD, 10);
    const userId: Record<string, number> = {};
    for (const u of users) {
      await q(
        `IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = @username OR Email = @email)
           INSERT dbo.Users (Username, Password, Email, FullName, Role) VALUES (@username, @password, @email, @fullName, @role)`,
        { username: u.username, password: hash, email: `${u.username}@itoj.local`, fullName: u.fullName, role: u.role },
      );
      userId[u.username] = (await scalar(`SELECT UserID FROM dbo.Users WHERE Username = @username`, { username: u.username }))!;
    }
    const teacherIds = byRole("Teacher").map((u) => userId[u.username]);
    const taIds = byRole("TA").map((u) => userId[u.username]);
    const studentIds = byRole("User").map((u) => userId[u.username]);
    if (!teacherIds.length || !studentIds.length) throw new Error("Cần ít nhất 1 giảng viên và 1 học viên (tăng --users).");

    // ---- Problems + testcases ----
    const problemId: Record<string, number> = {};
    for (const [i, p] of problems.entries()) {
      // Bài chờ duyệt do trợ giảng gửi; còn lại thuộc giảng viên.
      const creator = p.status === "Pending" && taIds.length ? taIds[i % taIds.length] : teacherIds[i % teacherIds.length];
      let id = await scalar(`SELECT ProblemID FROM dbo.Problems WHERE CreatorID = @creator AND Title = @title`, { creator, title: p.title });
      if (id === undefined) {
        id = await scalar(
          `INSERT dbo.Problems (CreatorID, Title, Statement, InputFormat, OutputFormat, TimeLimit, MemoryLimit, Tags, Difficulty, Status, FunctionSpec, CompareMode)
           VALUES (@creator, @title, @statement, @inputFormat, @outputFormat, 1000, 256, @tags, @difficulty, @status, @spec, 'exact');
           SELECT CAST(SCOPE_IDENTITY() AS INT) AS id`,
          { creator, title: p.title, statement: p.statement, inputFormat: p.inputFormat, outputFormat: p.outputFormat, tags: p.tags, difficulty: p.difficulty, status: p.status, spec: JSON.stringify(p.spec) },
        );
      }
      problemId[p.key] = id!;
      const hasTests = await scalar(`SELECT COUNT(*) FROM dbo.Testcases WHERE ProblemID = @id`, { id });
      if (!hasTests) {
        for (const [n, tc] of p.testcases.entries()) {
          await q(
            `INSERT dbo.Testcases (ProblemID, InputData, ExpectedOutput, IsHidden, OrderIndex) VALUES (@id, @input, @expected, @hidden, @order)`,
            { id, input: tc.input.join("\n"), expected: tc.expected, hidden: tc.hidden, order: n + 1 },
          );
        }
      }
    }
    const publicKeys = problems.filter((p) => p.status === "Public").map((p) => p.key);

    // ---- Classes ----
    const classId: Record<string, number> = {};
    const classStudents: Record<string, number[]> = {};
    for (const [i, c] of classes.entries()) {
      const teacher = teacherIds[i % teacherIds.length];
      let id = await scalar(`SELECT ClassID FROM dbo.Classes WHERE InviteCode = @code`, { code: c.code });
      if (id === undefined) {
        id = await scalar(
          `INSERT dbo.Classes (TeacherID, InviteCode, ClassName, Description, IsPublic, ApprovalStatus, RejectionReason, IsCancelled)
           VALUES (@teacher, @code, @name, @description, @isPublic, @approval, @rejection, @cancelled);
           SELECT CAST(SCOPE_IDENTITY() AS INT) AS id`,
          {
            teacher, code: c.code, name: c.name, description: `Lớp dữ liệu mẫu số ${i + 1}.`, isPublic: c.isPublic ? 1 : 0, approval: c.approval,
            rejection: c.approval === "Rejected" ? "Nội dung lớp chưa phù hợp, vui lòng cập nhật mô tả." : null, cancelled: c.cancelled ? 1 : 0,
          },
        );
      }
      classId[c.code] = id!;
      // 20-50 học viên mỗi lớp, chọn vòng tròn theo chỉ số lớp để các lớp giao nhau một phần.
      const size = Math.min(studentIds.length, ri(20, 50));
      const members = Array.from({ length: size }, (_, k) => studentIds[(i * 17 + k * 7) % studentIds.length]);
      const unique = [...new Set(members)];
      classStudents[c.code] = unique;
      for (const sid of unique) {
        await q(
          `IF NOT EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @id AND UserID = @u)
             INSERT dbo.Class_Student (ClassID, UserID, ProgressPercent) VALUES (@id, @u, @progress)`,
          { id, u: sid, progress: ri(0, 100) },
        );
      }
      if (c.approval === "Approved" && taIds.length) {
        for (let t = 0; t < (i % 2) + 1; t++) {
          await q(
            `IF NOT EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = @id AND UserID_TA = @ta) INSERT dbo.Class_TA (ClassID, UserID_TA) VALUES (@id, @ta)`,
            { id, ta: taIds[(i + t * 5) % taIds.length] },
          );
        }
      }
      if (publicKeys.length) {
        for (const [n, key] of Array.from({ length: ri(3, 6) }, (_, k) => publicKeys[(i * 3 + k * 11) % publicKeys.length]).entries()) {
          const due = n % 3 === 0 ? -ri(1, 10) * 24 * 60 : n % 3 === 1 ? ri(1, 30) * 24 * 60 : null;
          await q(
            `IF NOT EXISTS (SELECT 1 FROM dbo.Class_Problem WHERE ClassID = @id AND ProblemID = @p)
               INSERT dbo.Class_Problem (ClassID, ProblemID, AssignedDate, DueDate)
               VALUES (@id, @p, DATEADD(DAY, -45, SYSUTCDATETIME()), CASE WHEN @due IS NULL THEN NULL ELSE DATEADD(MINUTE, CAST(@due AS INT), SYSUTCDATETIME()) END)`,
            { id, p: problemId[key], due },
          );
        }
      }
      // Một số yêu cầu tham gia đang chờ duyệt từ học viên ngoài lớp.
      if (i % 5 === 0 && c.approval === "Approved" && !c.isPublic) {
        const outsider = studentIds.find((s) => !unique.includes(s));
        if (outsider !== undefined) {
          await q(
            `IF NOT EXISTS (SELECT 1 FROM dbo.Class_JoinRequests WHERE ClassID = @c AND UserID = @u)
               INSERT dbo.Class_JoinRequests (ClassID, UserID, Message, Status) VALUES (@c, @u, @message, 'Pending')`,
            { c: id, u: outsider, message: "Em muốn tham gia lớp để luyện tập thêm ạ." },
          );
        }
      }
    }

    // ---- Contests ----
    const contestId: number[] = [];
    const participants: number[][] = [];
    const approvedClasses = classes.filter((c) => c.approval === "Approved" && !c.cancelled);
    for (const [i, c] of contests.entries()) {
      const creator = teacherIds[i % teacherIds.length];
      const linked = i % 3 === 0 && approvedClasses.length ? approvedClasses[i % approvedClasses.length] : null;
      let id = await scalar(`SELECT ContestID FROM dbo.Contests WHERE CreatorID = @creator AND ContestName = @name`, { creator, name: c.name });
      if (id === undefined) {
        id = await scalar(
          `INSERT dbo.Contests (CreatorID, ContestName, Description, StartTime, EndTime, [Password], ClassID)
           VALUES (@creator, @name, @description, DATEADD(MINUTE, CAST(@start AS INT), SYSUTCDATETIME()), DATEADD(MINUTE, CAST(@end AS INT), SYSUTCDATETIME()), @password, @classId);
           SELECT CAST(SCOPE_IDENTITY() AS INT) AS id`,
          { creator, name: c.name, description: "Kỳ thi dữ liệu mẫu.", start: c.start, end: c.end, password: c.protectedByPassword ? CONTEST_PASSWORD : null, classId: linked ? classId[linked.code] : null },
        );
      }
      contestId.push(id!);
      const problemKeys = Array.from({ length: ri(3, 5) }, (_, k) => publicKeys[(i * 5 + k * 13) % publicKeys.length]);
      for (const [n, key] of [...new Set(problemKeys)].entries()) {
        await q(
          `IF NOT EXISTS (SELECT 1 FROM dbo.Contest_Problem WHERE ContestID = @id AND ProblemID = @p)
             INSERT dbo.Contest_Problem (ContestID, ProblemID, MaxScore, OrderIndex) VALUES (@id, @p, 100, @order)`,
          { id, p: problemId[key], order: n },
        );
      }
      const pool_ = linked ? classStudents[linked.code] : studentIds;
      const take = Math.min(pool_.length, ri(20, 80));
      const picked = [...new Set(Array.from({ length: take }, (_, k) => pool_[(i * 31 + k * 3) % pool_.length]))];
      participants.push(picked);
      if (c.start < 120) {
        for (const sid of picked) {
          await q(`IF NOT EXISTS (SELECT 1 FROM dbo.Contest_User WHERE ContestID = @id AND UserID = @u) INSERT dbo.Contest_User (ContestID, UserID) VALUES (@id, @u)`, { id, u: sid });
        }
      }
    }

    // ---- Submissions ----
    // Chỉ thêm khi chưa có bài nộp nào của tài khoản sample_s*: chạy lại không nhân đôi.
    const existing = await scalar(`SELECT COUNT(*) FROM dbo.Submissions s JOIN dbo.Users u ON u.UserID = s.UserID WHERE u.Username LIKE 'sample[_]s%'`);
    let submitted = 0;
    if (!existing && SUBMISSIONS > 0 && publicKeys.length) {
      const subs: Sub[] = [];
      // Bài nộp trong các kỳ thi đã kết thúc: mỗi thí sinh thử một vài bài.
      for (const [i, c] of contests.entries()) {
        if (c.end >= 0) continue;
        for (const sid of participants[i].slice(0, 12)) {
          const skill = 0.35 + rand() * 0.55;
          const keys = [...new Set(Array.from({ length: 3 }, (_, k) => publicKeys[(i * 5 + k * 13) % publicKeys.length]))];
          for (const [j, key] of keys.entries()) {
            const solved = rand() < skill - 0.08 * j;
            for (let w = ri(0, solved ? 2 : 1); w > 0; w--) subs.push({ student: sid, problem: key, verdict: pick(FAILS), contest: contestId[i], at: c.start + ri(5, c.end - c.start - 2) });
            if (solved) subs.push({ student: sid, problem: key, verdict: "AC", contest: contestId[i], at: c.start + ri(10, c.end - c.start - 1) });
          }
        }
      }
      // Phần còn lại là luyện tập ngoài kỳ thi trong ~6 tuần gần đây.
      while (subs.length < SUBMISSIONS) {
        subs.push({ student: pick(studentIds), problem: pick(publicKeys), verdict: rand() < 0.45 ? "AC" : pick(FAILS), contest: null, at: -ri(1, 42 * 24 * 60) });
      }
      const probByKey = new Map(problems.map((p) => [p.key, p]));
      const tcCache = new Map<string, number[]>();
      const ordered = subs.sort((a, b) => a.at - b.at);
      for (const s of ordered) {
        const def = probByKey.get(s.problem)!;
        let tcs = tcCache.get(s.problem);
        if (!tcs) {
          tcs = (await q<{ TestCaseID: number }>(`SELECT TestCaseID FROM dbo.Testcases WHERE ProblemID = @p ORDER BY OrderIndex`, { p: problemId[s.problem] })).map((r) => r.TestCaseID);
          tcCache.set(s.problem, tcs);
        }
        const total = tcs.length;
        const passed = s.verdict === "AC" ? total : s.verdict === "CE" ? 0 : Math.max(1, Math.floor(total / 2));
        const code = s.verdict === "CE" ? "def (:\n" : s.verdict === "AC" ? def.ok : s.verdict === "WA" ? def.ok.replace(/return .*/, "return 0") : s.verdict === "TLE" ? "while True:\n    pass\n" : "raise Exception('boom')\n";
        const runtime = s.verdict === "TLE" ? 1000 : s.verdict === "CE" ? null : 20 + ((Math.abs(s.at) * 7) & 63);
        const memory = s.verdict === "CE" ? null : 8 + ((Math.abs(s.at) * 3) % 20);
        const id = (await scalar(
          `INSERT dbo.Submissions (UserID, ProblemID, ContestID, SourceCode, Language, SubmitTime, Result)
           VALUES (@u, @p, @c, @code, 'python', DATEADD(MINUTE, CAST(@at AS INT), SYSUTCDATETIME()), 'Pending');
           SELECT CAST(SCOPE_IDENTITY() AS INT) AS id`,
          { u: s.student, p: problemId[s.problem], c: s.contest, code, at: s.at },
        ))!;
        // Pending -> kết quả cuối bằng UPDATE để trigger bảng xếp hạng kỳ thi tự tính.
        await q(
          `UPDATE dbo.Submissions SET Result = @result, Runtime = @runtime, Memory = @memory, PassedCases = @passed, JudgedAt = DATEADD(SECOND, 5, SubmitTime) WHERE SubmissionID = @id`,
          { id, result: s.verdict, runtime, memory, passed: `${passed}/${total}` },
        );
        const rows = s.verdict === "CE" ? 1 : s.verdict === "AC" ? total : Math.min(total, passed + 1);
        for (let n = 0; n < rows; n++) {
          const failing = s.verdict !== "AC" && n === rows - 1;
          await q(
            `INSERT dbo.SubmissionResults (SubmissionID, TestCaseID, Verdict, Runtime, Memory) VALUES (@id, @tc, @verdict, @runtime, @memory)`,
            { id, tc: tcs[n], verdict: failing || s.verdict === "CE" ? s.verdict : "AC", runtime: s.verdict === "CE" ? null : 10 + n * 3, memory },
          );
        }
        submitted++;
      }
    }

    await tx.commit();
    console.log(`\nĐã nạp xong: ${users.length} người dùng, ${classes.length} lớp, ${problems.length} bài tập, ${contests.length} kỳ thi, ${submitted} bài nộp.`);
    console.log(`Mật khẩu các kỳ thi có khoá (chỉ áp dụng cho kỳ thi mới tạo ở lần chạy này): ${CONTEST_PASSWORD}`);
    console.log("Dọn dẹp nếu cần: npm run db:clean:sample -- --yes");
  } catch (err) {
    await tx.rollback().catch(() => undefined);
    throw err;
  } finally {
    await pool.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
