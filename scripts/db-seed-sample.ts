import "dotenv/config";
import bcrypt from "bcryptjs";
import sql from "mssql";
import { env } from "../src/lib/env";
import { validateFunctionTestcase } from "../src/modules/problem/function-spec";
import { extraClasses } from "./seed-data/classes";
import { extraContests } from "./seed-data/contests";
import { extraProblems } from "./seed-data/problems";
import { contestSubmissions, practiceSubmissions } from "./seed-data/submissions";
import { badSources, type ClassDef, type ContestDef, type SampleProblem, type Sub } from "./seed-data/types";

// Bộ dữ liệu ban đầu cho bản deploy. Idempotent: chạy lại không nhân đôi dữ liệu.
// Mật khẩu không nằm trong source: truyền qua biến môi trường SEED_PASSWORD khi chạy.

const PASSWORD = process.env.SEED_PASSWORD ?? "";
if (PASSWORD.length < 8) {
  console.error("Thiếu SEED_PASSWORD (tối thiểu 8 ký tự). Ví dụ: SEED_PASSWORD='...' npx tsx scripts/db-seed-sample.ts");
  process.exit(1);
}
const CONTEST_PASSWORD = PASSWORD;

const problems: SampleProblem[] = [
  {
    key: "sum",
    title: "Tổng hai số",
    difficulty: "Easy",
    status: "Public",
    tags: "math,basic",
    statement: "Viết hàm `sumTwo(a, b)` trả về tổng của hai số nguyên `a` và `b`.",
    inputFormat: "Hai số nguyên a, b (|a|, |b| ≤ 10^9).",
    outputFormat: "Tổng a + b.",
    spec: {
      name: "sumTwo",
      params: [
        { name: "a", type: "int" },
        { name: "b", type: "int" },
      ],
      returns: "long",
    },
    testcases: [
      { input: ["1", "2"], expected: "3", hidden: false },
      { input: ["-5", "5"], expected: "0", hidden: false },
      { input: ["100000", "200000"], expected: "300000", hidden: true },
      { input: ["2000000000", "2000000000"], expected: "4000000000", hidden: true },
      { input: ["-7", "-8"], expected: "-15", hidden: true },
    ],
  },
  {
    key: "prime",
    title: "Kiểm tra số nguyên tố",
    difficulty: "Easy",
    status: "Public",
    tags: "math,prime",
    statement: "Viết hàm `isPrime(n)` trả về `true` nếu `n` là số nguyên tố, ngược lại `false`.",
    inputFormat: "Một số nguyên n (0 ≤ n ≤ 10^6).",
    outputFormat: "true hoặc false.",
    spec: { name: "isPrime", params: [{ name: "n", type: "int" }], returns: "bool" },
    testcases: [
      { input: ["2"], expected: "true", hidden: false },
      { input: ["1"], expected: "false", hidden: false },
      { input: ["17"], expected: "true", hidden: true },
      { input: ["100"], expected: "false", hidden: true },
      { input: ["7919"], expected: "true", hidden: true },
      { input: ["0"], expected: "false", hidden: true },
    ],
  },
  {
    key: "reverse",
    title: "Đảo ngược chuỗi",
    difficulty: "Easy",
    status: "Public",
    tags: "string",
    statement: "Viết hàm `reverseString(s)` trả về chuỗi `s` được đảo ngược thứ tự ký tự.",
    inputFormat: "Một chuỗi s (độ dài 1..1000).",
    outputFormat: "Chuỗi đã đảo ngược.",
    spec: { name: "reverseString", params: [{ name: "s", type: "string" }], returns: "string" },
    testcases: [
      { input: ['"hello"'], expected: '"olleh"', hidden: false },
      { input: ['"a"'], expected: '"a"', hidden: false },
      { input: ['"ITOJ"'], expected: '"JOTI"', hidden: true },
      { input: ['"abc def"'], expected: '"fed cba"', hidden: true },
      { input: ['"racecar"'], expected: '"racecar"', hidden: true },
    ],
  },
  {
    key: "maxsub",
    title: "Tổng dãy con lớn nhất",
    difficulty: "Medium",
    status: "Public",
    tags: "array,dp",
    statement:
      "Cho mảng số nguyên `nums`. Viết hàm `maxSubarray(nums)` trả về tổng lớn nhất của một dãy con liên tiếp không rỗng.",
    inputFormat: "Mảng nums (1 ≤ độ dài ≤ 10^5, |nums[i]| ≤ 10^4).",
    outputFormat: "Tổng lớn nhất.",
    spec: { name: "maxSubarray", params: [{ name: "nums", type: "int[]" }], returns: "long" },
    testcases: [
      { input: ["[-2,1,-3,4,-1,2,1,-5,4]"], expected: "6", hidden: false },
      { input: ["[1]"], expected: "1", hidden: false },
      { input: ["[-3,-1,-2]"], expected: "-1", hidden: true },
      { input: ["[5,4,-1,7,8]"], expected: "23", hidden: true },
      { input: ["[0,0,0]"], expected: "0", hidden: true },
    ],
  },
  {
    key: "twosum",
    title: "Hai số có tổng bằng target",
    difficulty: "Medium",
    status: "Public",
    tags: "array,hash",
    statement:
      "Cho mảng `nums` và số `target`. Trả về hai chỉ số (tăng dần) của hai phần tử có tổng bằng `target`. Đảm bảo có đúng một đáp án.",
    inputFormat: "Mảng nums và số nguyên target.",
    outputFormat: "Mảng gồm hai chỉ số tăng dần.",
    spec: {
      name: "twoSum",
      params: [
        { name: "nums", type: "int[]" },
        { name: "target", type: "int" },
      ],
      returns: "int[]",
    },
    testcases: [
      { input: ["[2,7,11,15]", "9"], expected: "[0,1]", hidden: false },
      { input: ["[3,2,4]", "6"], expected: "[1,2]", hidden: false },
      { input: ["[3,3]", "6"], expected: "[0,1]", hidden: true },
      { input: ["[1,5,9,14]", "23"], expected: "[2,3]", hidden: true },
      { input: ["[-1,-2,-3,-4,-5]", "-8"], expected: "[2,4]", hidden: true },
    ],
  },
  {
    key: "paths",
    title: "Đếm đường đi trong lưới",
    difficulty: "Hard",
    status: "Public",
    tags: "dp,math",
    statement:
      "Robot ở góc trên trái lưới `m x n`, chỉ đi sang phải hoặc xuống dưới. Viết hàm `uniquePaths(m, n)` trả về số đường đi đến góc dưới phải.",
    inputFormat: "Hai số nguyên m, n (1 ≤ m, n ≤ 30).",
    outputFormat: "Số đường đi.",
    spec: {
      name: "uniquePaths",
      params: [
        { name: "m", type: "int" },
        { name: "n", type: "int" },
      ],
      returns: "long",
    },
    testcases: [
      { input: ["3", "7"], expected: "28", hidden: false },
      { input: ["3", "2"], expected: "3", hidden: false },
      { input: ["1", "1"], expected: "1", hidden: true },
      { input: ["3", "3"], expected: "6", hidden: true },
      { input: ["10", "10"], expected: "48620", hidden: true },
      { input: ["23", "12"], expected: "193536720", hidden: true },
    ],
  },
  {
    key: "fib",
    title: "Fibonacci",
    difficulty: "Easy",
    status: "Private",
    tags: "math,dp",
    statement: "Viết hàm `fib(n)` trả về số Fibonacci thứ n (fib(0)=0, fib(1)=1).",
    inputFormat: "Số nguyên n (0 ≤ n ≤ 80).",
    outputFormat: "fib(n).",
    spec: { name: "fib", params: [{ name: "n", type: "int" }], returns: "long" },
    testcases: [
      { input: ["10"], expected: "55", hidden: false },
      { input: ["1"], expected: "1", hidden: true },
      { input: ["0"], expected: "0", hidden: true },
      { input: ["50"], expected: "12586269025", hidden: true },
    ],
  },
  {
    key: "fact",
    title: "Giai thừa",
    difficulty: "Easy",
    status: "Hidden",
    tags: "math",
    statement: "Viết hàm `factorial(n)` trả về n!.",
    inputFormat: "Số nguyên n (0 ≤ n ≤ 15).",
    outputFormat: "n!.",
    spec: { name: "factorial", params: [{ name: "n", type: "int" }], returns: "long" },
    testcases: [
      { input: ["5"], expected: "120", hidden: false },
      { input: ["0"], expected: "1", hidden: true },
      { input: ["10"], expected: "3628800", hidden: true },
      { input: ["15"], expected: "1307674368000", hidden: true },
    ],
  },
];

// Mã nguồn mẫu (Python) cho từng bài: ok = đúng, wrong = sai kết quả, loop = lặp vô hạn, crash = lỗi runtime.
const sources: Record<string, { ok: string; wrong: string; loop: string; crash: string }> = {
  sum: {
    ok: "def sumTwo(a, b):\n    return a + b\n",
    wrong: "def sumTwo(a, b):\n    return a - b\n",
    loop: "def sumTwo(a, b):\n    while True:\n        pass\n",
    crash: "def sumTwo(a, b):\n    return a // 0\n",
  },
  prime: {
    ok: "def isPrime(n):\n    if n < 2:\n        return False\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            return False\n        i += 1\n    return True\n",
    wrong: "def isPrime(n):\n    return n > 1 and n % 2 != 0\n",
    loop: "def isPrime(n):\n    while True:\n        pass\n",
    crash: "def isPrime(n):\n    return [][n]\n",
  },
  reverse: {
    ok: "def reverseString(s):\n    return s[::-1]\n",
    wrong: "def reverseString(s):\n    return s\n",
    loop: "def reverseString(s):\n    while True:\n        pass\n",
    crash: "def reverseString(s):\n    return s[100000]\n",
  },
  maxsub: {
    ok: "def maxSubarray(nums):\n    best = cur = nums[0]\n    for x in nums[1:]:\n        cur = max(x, cur + x)\n        best = max(best, cur)\n    return best\n",
    wrong: "def maxSubarray(nums):\n    return sum(nums)\n",
    loop: "def maxSubarray(nums):\n    best = nums[0]\n    n = len(nums)\n    for i in range(n):\n        for j in range(i, n):\n            while True:\n                pass\n    return best\n",
    crash: "def maxSubarray(nums):\n    return nums[len(nums)]\n",
  },
  twosum: {
    ok: "def twoSum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], i]\n        seen[x] = i\n    return []\n",
    wrong: "def twoSum(nums, target):\n    return [0, 1]\n",
    loop: "def twoSum(nums, target):\n    while True:\n        pass\n",
    crash: "def twoSum(nums, target):\n    return nums[target]\n",
  },
  paths: {
    ok: "def uniquePaths(m, n):\n    dp = [1] * n\n    for _ in range(1, m):\n        for j in range(1, n):\n            dp[j] += dp[j - 1]\n    return dp[-1]\n",
    wrong: "def uniquePaths(m, n):\n    return m * n\n",
    loop: "def uniquePaths(m, n):\n    while True:\n        pass\n",
    crash: "def uniquePaths(m, n):\n    return m // (n - n)\n",
  },
};
for (const p of extraProblems) {
  if (p.ok) sources[p.key] = badSources(p.spec, p.ok);
}
const allProblems: SampleProblem[] = [...problems, ...extraProblems];
const COMPILE_ERROR_SRC = "def broken(:\n    return\n";

// Contest A: bắt đầu -4320 phút (3 ngày trước), kéo dài 120 phút. Contest B: bắt đầu -60 phút.
const A0 = -4320;
const B0 = -60;
const subs: Sub[] = [
  // Contest A (đã kết thúc)
  { student: 1, problem: "sum", verdict: "AC", contest: "A", at: A0 + 8 },
  { student: 1, problem: "prime", verdict: "WA", contest: "A", at: A0 + 20 },
  { student: 1, problem: "prime", verdict: "AC", contest: "A", at: A0 + 31 },
  { student: 1, problem: "maxsub", verdict: "TLE", contest: "A", at: A0 + 70 },
  { student: 2, problem: "sum", verdict: "AC", contest: "A", at: A0 + 12 },
  { student: 2, problem: "prime", verdict: "AC", contest: "A", at: A0 + 25 },
  { student: 2, problem: "maxsub", verdict: "AC", contest: "A", at: A0 + 62 },
  { student: 3, problem: "sum", verdict: "CE", contest: "A", at: A0 + 5 },
  { student: 3, problem: "sum", verdict: "AC", contest: "A", at: A0 + 9 },
  { student: 3, problem: "prime", verdict: "RE", contest: "A", at: A0 + 40 },
  { student: 4, problem: "sum", verdict: "WA", contest: "A", at: A0 + 15 },
  // Contest B (đang diễn ra)
  { student: 1, problem: "prime", verdict: "AC", contest: "B", at: B0 + 10 },
  { student: 1, problem: "reverse", verdict: "AC", contest: "B", at: B0 + 22 },
  { student: 2, problem: "prime", verdict: "WA", contest: "B", at: B0 + 12 },
  { student: 2, problem: "prime", verdict: "AC", contest: "B", at: B0 + 18 },
  { student: 3, problem: "reverse", verdict: "RE", contest: "B", at: B0 + 25 },
  // Nộp thường (ngoài kỳ thi)
  { student: 1, problem: "sum", verdict: "AC", at: -2880 },
  { student: 1, problem: "reverse", verdict: "AC", at: -2000, lang: "cpp" },
  { student: 2, problem: "reverse", verdict: "WA", at: -1500 },
  { student: 2, problem: "twosum", verdict: "AC", at: -900 },
  { student: 3, problem: "paths", verdict: "TLE", at: -700 },
  { student: 4, problem: "maxsub", verdict: "AC", at: -500 },
  { student: 5, problem: "twosum", verdict: "WA", at: -300 },
  { student: 5, problem: "twosum", verdict: "AC", at: -240 },
  { student: 6, problem: "paths", verdict: "AC", at: -120 },
];

const CPP_OK: Record<string, string> = {
  reverse:
    "#include <string>\n#include <algorithm>\nstd::string reverseString(std::string s) {\n    std::reverse(s.begin(), s.end());\n    return s;\n}\n",
};

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

function validateProblems() {
  for (const p of allProblems) {
    for (const [i, tc] of p.testcases.entries()) {
      const err = validateFunctionTestcase(p.spec, tc.input.join("\n"), tc.expected);
      if (err) throw new Error(`Testcase #${i + 1} của "${p.title}" không hợp lệ: ${err}`);
    }
  }
}

async function main() {
  validateProblems();
  const pool = await connect();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  async function q<T = Record<string, unknown>>(
    text: string,
    params: Record<string, unknown> = {},
  ): Promise<T[]> {
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
    const userDefs = [
      { username: "admin", fullName: "Quản trị viên", role: "Admin" },
      { username: "teacher", fullName: "Giảng viên", role: "Teacher" },
      { username: "assist", fullName: "Trợ giảng", role: "TA" },
      { username: "user", fullName: "Học viên", role: "User" },
      { username: "teacher2", fullName: "Giảng viên 2", role: "Teacher" },
      { username: "assist2", fullName: "Trợ giảng 2", role: "TA" },
      { username: "user2", fullName: "Học viên 2", role: "User" },
    ];
    const userId: Record<string, number> = {};
    for (const u of userDefs) {
      const email = `${u.username}@itoj.local`;
      await q(
        `IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = @username OR Email = @email)
           INSERT dbo.Users (Username, Password, Email, FullName, Role)
           VALUES (@username, @password, @email, @fullName, @role)`,
        { username: u.username, password: hash, email, fullName: u.fullName, role: u.role },
      );
      userId[u.username] = (await scalar(`SELECT UserID FROM dbo.Users WHERE Username = @username`, {
        username: u.username,
      }))!;
    }
    const teacher = userId.teacher;
    const ta = userId.assist;
    // Dữ liệu đợt đầu chỉ có một học viên nên gán hết cho `user`; dữ liệu bổ sung chia lẻ/chẵn cho user và user2.
    const legacyStudent = (_i: number) => userId.user;
    const student = (i: number) => (i % 2 === 1 ? userId.user : userId.user2);
    const creatorId = (c?: "teacher" | "teacher2") => userId[c ?? "teacher"];

    // ---- Problems + testcases ----
    const problemId: Record<string, number> = {};
    for (const p of allProblems) {
      const creator = creatorId(p.creator);
      let id = await scalar(
        `SELECT ProblemID FROM dbo.Problems WHERE CreatorID = @creator AND Title = @title`,
        { creator, title: p.title },
      );
      if (id === undefined) {
        id = await scalar(
          `INSERT dbo.Problems (CreatorID, Title, Statement, InputFormat, OutputFormat, TimeLimit, MemoryLimit, Tags, Difficulty, Status, FunctionSpec, RejectionReason, ProposedStatus, CompareMode, FloatEpsilon)
           VALUES (@creator, @title, @statement, @inputFormat, @outputFormat, 1000, 256, @tags, @difficulty, @status, @spec, @rejection, @proposed, @compare, @epsilon);
           SELECT CAST(SCOPE_IDENTITY() AS INT) AS id`,
          {
            creator,
            title: p.title,
            statement: p.statement,
            inputFormat: p.inputFormat,
            outputFormat: p.outputFormat,
            tags: p.tags,
            difficulty: p.difficulty,
            status: p.status,
            spec: JSON.stringify(p.spec),
            rejection: p.rejectionReason ?? null,
            proposed: p.proposedStatus ?? null,
            compare: p.compareMode ?? "exact",
            epsilon: p.floatEpsilon ?? null,
          },
        );
      }
      problemId[p.key] = id!;
      const hasTests = await scalar(`SELECT COUNT(*) FROM dbo.Testcases WHERE ProblemID = @id`, { id });
      if (!hasTests) {
        for (const [i, tc] of p.testcases.entries()) {
          await q(
            `INSERT dbo.Testcases (ProblemID, InputData, ExpectedOutput, IsHidden, OrderIndex, GroupNo)
             VALUES (@id, @input, @expected, @hidden, @order, @group)`,
            {
              id,
              input: tc.input.join("\n"),
              expected: tc.expected,
              hidden: tc.hidden,
              order: i + 1,
              group: tc.g ?? null,
            },
          );
        }
        for (const g of p.groups ?? []) {
          await q(`INSERT dbo.TestcaseGroups (ProblemID, GroupNo, Points) VALUES (@id, @no, @points)`, {
            id,
            no: g.groupNo,
            points: g.points,
          });
        }
      }
    }

    // ---- Classes ----
    const legacyClasses: ClassDef[] = [
      {
        code: "NMLT2026",
        name: "Nhập môn lập trình",
        description: "Lớp công khai dành cho học viên năm nhất, có trợ giảng hỗ trợ.",
        isPublic: 1,
        teacher: "teacher",
        ta: "assist",
        students: [1, 2, 3, 4, 5],
        problems: [
          { key: "sum", due: 7 * 24 * 60 },
          { key: "prime", due: 14 * 24 * 60 },
          { key: "reverse", due: -2 * 24 * 60 },
        ],
      },
      {
        code: "CTDL2026",
        name: "Cấu trúc dữ liệu và giải thuật",
        description: "Lớp riêng tư, tham gia bằng mã mời.",
        isPublic: 0,
        teacher: "teacher",
        ta: "assist",
        students: [3, 4, 5, 6],
        problems: [
          { key: "maxsub", due: 10 * 24 * 60 },
          { key: "twosum", due: 10 * 24 * 60 },
          { key: "paths", due: null },
        ],
      },
    ];
    const classId: Record<string, number> = {};
    for (const [classIdx, c] of [...legacyClasses, ...extraClasses].entries()) {
      const isLegacy = classIdx < legacyClasses.length;
      const toStudent = isLegacy ? legacyStudent : student;
      const teacherId = creatorId(c.teacher);
      const taId = userId[c.ta];
      let id = await scalar(`SELECT ClassID FROM dbo.Classes WHERE InviteCode = @code`, { code: c.code });
      if (id === undefined) {
        id = await scalar(
          `INSERT dbo.Classes (TeacherID, InviteCode, ClassName, Description, IsPublic, ApprovalStatus, RejectionReason, IsCancelled)
           VALUES (@teacher, @code, @name, @description, @isPublic, @approval, @rejection, @cancelled);
           SELECT CAST(SCOPE_IDENTITY() AS INT) AS id`,
          {
            teacher: teacherId,
            code: c.code,
            name: c.name,
            description: c.description,
            isPublic: c.isPublic,
            approval: c.approval ?? "Approved",
            rejection: c.rejectionReason ?? null,
            cancelled: c.cancelled ? 1 : 0,
          },
        );
      }
      classId[c.code] = id!;
      for (const [k, st] of c.students.entries()) {
        await q(
          `IF NOT EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @id AND UserID = @u)
             INSERT dbo.Class_Student (ClassID, UserID, ProgressPercent)
             VALUES (@id, @u, @progress)`,
          { id, u: toStudent(st), progress: isLegacy ? 0 : 25 + ((classIdx * 17 + k * 29) % 70) },
        );
      }
      if (c.approval === undefined || c.approval === "Approved") {
        await q(
          `IF NOT EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = @id AND UserID_TA = @ta)
             INSERT dbo.Class_TA (ClassID, UserID_TA) VALUES (@id, @ta)`,
          { id, ta: taId },
        );
      }
      for (const cp of c.problems) {
        // AssignedDate đặt sớm hơn hạn nộp để thỏa CK_CP_Due kể cả với bài quá hạn.
        await q(
          `IF NOT EXISTS (SELECT 1 FROM dbo.Class_Problem WHERE ClassID = @id AND ProblemID = @p)
             INSERT dbo.Class_Problem (ClassID, ProblemID, AssignedDate, DueDate)
             VALUES (@id, @p, DATEADD(DAY, -45, SYSUTCDATETIME()),
                     CASE WHEN @due IS NULL THEN NULL ELSE DATEADD(MINUTE, CAST(@due AS INT), SYSUTCDATETIME()) END)`,
          { id, p: problemId[cp.key], due: cp.due },
        );
      }
    }

    // ---- Yêu cầu tham gia lớp / trợ giảng (đang chờ duyệt hoặc đã xử lý) ----
    const joinRequests = [
      { code: "GTNC2026", u: 2, message: "Em muốn tham gia lớp để luyện thêm quy hoạch động ạ.", status: "Pending" },
      { code: "OLPTIN2026", u: 1, message: "Em xin vào đội tuyển, em đã làm các bài DP cơ bản.", status: "Rejected" },
    ];
    for (const r of joinRequests) {
      await q(
        `IF NOT EXISTS (SELECT 1 FROM dbo.Class_JoinRequests WHERE ClassID = @c AND UserID = @u)
           INSERT dbo.Class_JoinRequests (ClassID, UserID, Message, Status, ReviewedAt, ReviewedBy)
           VALUES (@c, @u, @message, @status,
                   CASE WHEN @status = 'Pending' THEN NULL ELSE SYSUTCDATETIME() END,
                   CASE WHEN @status = 'Pending' THEN NULL ELSE @reviewer END)`,
        { c: classId[r.code], u: student(r.u), message: r.message, status: r.status, reviewer: userId.teacher },
      );
    }
    await q(
      `IF NOT EXISTS (SELECT 1 FROM dbo.TA_Requests WHERE ClassID = @c AND UserID = @u)
         INSERT dbo.TA_Requests (ClassID, UserID, RequestedBy, Status) VALUES (@c, @u, @by, 'Pending')`,
      { c: classId.PYTHON2026, u: student(2), by: userId.teacher2 },
    );

    // ---- Contests ----
    const legacyContests: ContestDef[] = [
      {
        key: "A",
        name: "Kỳ thi giữa kỳ",
        description: "Kỳ thi giữa kỳ đã kết thúc.",
        start: A0,
        end: A0 + 120,
        password: null as string | null,
        classCode: null as string | null,
        problems: [
          ["sum", 100],
          ["prime", 100],
          ["maxsub", 200],
        ] as [string, number][],
        participants: [1, 2, 3, 4],
      },
      {
        key: "B",
        name: "Kỳ thi thực hành tuần 5",
        description: "Kỳ thi dành cho lớp Nhập môn lập trình.",
        start: B0,
        end: B0 + 300,
        password: null,
        classCode: "NMLT2026",
        problems: [
          ["prime", 100],
          ["reverse", 150],
          ["twosum", 250],
        ] as [string, number][],
        participants: [1, 2, 3],
      },
      {
        key: "C",
        name: "Kỳ thi cuối kỳ",
        description: "Kỳ thi sắp diễn ra, cần mật khẩu để tham gia.",
        start: 2 * 24 * 60,
        end: 2 * 24 * 60 + 180,
        password: CONTEST_PASSWORD,
        classCode: null,
        problems: [
          ["maxsub", 100],
          ["twosum", 100],
          ["paths", 200],
        ] as [string, number][],
        participants: [],
      },
    ];
    const contestId: Record<string, number> = {};
    for (const [contestIdx, c] of [...legacyContests, ...extraContests].entries()) {
      const toStudent = contestIdx < legacyContests.length ? legacyStudent : student;
      const creator = creatorId(c.creator);
      let id = await scalar(
        `SELECT ContestID FROM dbo.Contests WHERE CreatorID = @creator AND ContestName = @name`,
        { creator, name: c.name },
      );
      if (id === undefined) {
        id = await scalar(
          `INSERT dbo.Contests (CreatorID, ContestName, Description, StartTime, EndTime, [Password], ClassID)
           VALUES (@creator, @name, @description,
                   DATEADD(MINUTE, CAST(@start AS INT), SYSUTCDATETIME()), DATEADD(MINUTE, CAST(@end AS INT), SYSUTCDATETIME()),
                   @password, @classId);
           SELECT CAST(SCOPE_IDENTITY() AS INT) AS id`,
          {
            creator,
            name: c.name,
            description: c.description,
            start: c.start,
            end: c.end,
            password: c.password,
            classId: c.classCode ? classId[c.classCode] : null,
          },
        );
      }
      contestId[c.key] = id!;
      for (const [i, [key, score]] of c.problems.entries()) {
        await q(
          `IF NOT EXISTS (SELECT 1 FROM dbo.Contest_Problem WHERE ContestID = @id AND ProblemID = @p)
             INSERT dbo.Contest_Problem (ContestID, ProblemID, MaxScore, OrderIndex)
             VALUES (@id, @p, @score, @order)`,
          { id, p: problemId[key], score, order: i },
        );
      }
      for (const s of c.participants) {
        await q(
          `IF NOT EXISTS (SELECT 1 FROM dbo.Contest_User WHERE ContestID = @id AND UserID = @u)
             INSERT dbo.Contest_User (ContestID, UserID) VALUES (@id, @u)`,
          { id, u: toStudent(s) },
        );
      }
    }

    // ---- Submissions ----
    // Đợt đầu (gán cho `user`) chỉ thêm khi 4 tài khoản gốc chưa có bài nộp; đợt bổ sung chỉ thêm khi `user2` chưa có.
    const legacyIds = ["admin", "teacher", "assist", "user"].map((n) => userId[n]);
    const idList = legacyIds.join(",");

    async function insertSubmissions(list: Sub[], toStudent: (i: number) => number): Promise<number[]> {
      const ids: number[] = [];
      const ordered = [...list].sort((a, b) => a.at - b.at);
      for (const s of ordered) {
        const lang = s.lang ?? "python";
        const src = sources[s.problem];
        const code =
          s.verdict === "CE"
            ? COMPILE_ERROR_SRC
            : lang === "cpp" && s.verdict === "AC" && CPP_OK[s.problem]
              ? CPP_OK[s.problem]
              : s.verdict === "AC"
                ? src.ok
                : s.verdict === "WA"
                  ? src.wrong
                  : s.verdict === "TLE"
                    ? src.loop
                    : src.crash;
        const tcs = await q<{ TestCaseID: number; GroupNo: number | null }>(
          `SELECT TestCaseID, GroupNo FROM dbo.Testcases WHERE ProblemID = @p ORDER BY OrderIndex`,
          { p: problemId[s.problem] },
        );
        const total = tcs.length;
        // Số testcase qua: AC = tất cả; CE = 0; WA/TLE/RE dừng ở một testcase giữa chừng.
        const passed = s.verdict === "AC" ? total : s.verdict === "CE" ? 0 : Math.max(1, Math.floor(total / 2));
        const runtime = s.verdict === "TLE" ? 1000 : s.verdict === "CE" ? null : 20 + ((s.at * 7) & 63);
        const memory = s.verdict === "CE" ? null : 8 + ((Math.abs(s.at) * 3) % 20);

        // Điểm theo nhóm: nhóm tính điểm khi mọi testcase của nhóm đều qua.
        const groups = allProblems.find((p) => p.key === s.problem)!.groups ?? [];
        const score = groups.length
          ? groups
              .filter((g) => tcs.every((t, i) => t.GroupNo !== g.groupNo || i < passed))
              .reduce((sum, g) => sum + g.points, 0)
          : null;
        const maxScore = groups.length ? groups.reduce((sum, g) => sum + g.points, 0) : null;

        const id = (await scalar(
          `INSERT dbo.Submissions (UserID, ProblemID, ContestID, SourceCode, Language, SubmitTime, Result)
           VALUES (@u, @p, @c, @code, @lang, DATEADD(MINUTE, CAST(@at AS INT), SYSUTCDATETIME()), 'Pending');
           SELECT CAST(SCOPE_IDENTITY() AS INT) AS id`,
          {
            u: toStudent(s.student),
            p: problemId[s.problem],
            c: s.contest ? contestId[s.contest] : null,
            code,
            lang,
            at: s.at,
          },
        ))!;
        ids.push(id);

        // Đổi Pending -> kết quả cuối bằng UPDATE để trigger bảng xếp hạng kỳ thi tự tính.
        await q(
          `UPDATE dbo.Submissions
              SET Result = @result, Runtime = @runtime, Memory = @memory,
                  PassedCases = @passed, JudgedAt = DATEADD(SECOND, 5, SubmitTime),
                  Score = @score, MaxScore = @maxScore
            WHERE SubmissionID = @id`,
          { id, result: s.verdict, runtime, memory, passed: `${passed}/${total}`, score, maxScore },
        );

        const rows = s.verdict === "CE" ? 1 : s.verdict === "AC" ? total : Math.min(total, passed + 1);
        for (let i = 0; i < rows; i++) {
          const failing = s.verdict !== "AC" && i === rows - 1;
          await q(
            `INSERT dbo.SubmissionResults (SubmissionID, TestCaseID, Verdict, Runtime, Memory)
             VALUES (@id, @tc, @verdict, @runtime, @memory)`,
            {
              id,
              tc: tcs[i].TestCaseID,
              verdict: failing || s.verdict === "CE" ? s.verdict : "AC",
              runtime: s.verdict === "CE" ? null : 10 + i * 3,
              memory,
            },
          );
        }
      }
      return ids;
    }

    // Thông báo kết quả chấm cho một phần bài nộp (mỗi `every` bài).
    async function notifyJudged(list: Sub[], ids: number[], toStudent: (i: number) => number, every: number) {
      const ordered = [...list].sort((a, b) => a.at - b.at);
      for (const [idx, s] of ordered.entries()) {
        if (!["AC", "WA"].includes(s.verdict) || idx % every !== 0) continue;
        await q(
          `INSERT dbo.Notifications (UserID, Title, Body, Link, Type, IsRead)
           VALUES (@u, @title, @body, @link, 'judge_result', @read)`,
          {
            u: toStudent(s.student),
            title: `Kết quả chấm: ${s.verdict}`,
            body: `Bài nộp của bạn cho "${allProblems.find((p) => p.key === s.problem)!.title}" đã được chấm.`,
            link: `/submissions/${ids[idx]}`,
            read: idx % 2 === 0 ? 1 : 0,
          },
        );
      }
    }

    const existingSubs = await scalar(`SELECT COUNT(*) FROM dbo.Submissions WHERE UserID IN (${idList})`);
    if (!existingSubs) {
      const ids = await insertSubmissions(subs, legacyStudent);
      await notifyJudged(subs, ids, legacyStudent, 3);
    }

    const existingExtraSubs = await scalar(`SELECT COUNT(*) FROM dbo.Submissions WHERE UserID = @u`, {
      u: userId.user2,
    });
    if (!existingExtraSubs) {
      const endedExtra = extraContests.filter((c) => c.end < 0);
      const practiceKeys = allProblems.filter((p) => p.status === "Public" && sources[p.key]).map((p) => p.key);
      const extraSubs = [...contestSubmissions(endedExtra), ...practiceSubmissions(practiceKeys, 70)];
      const ids = await insertSubmissions(extraSubs, student);
      await notifyJudged(extraSubs, ids, student, 4);
    }

    // ---- Comments (bài tập) ----
    const existingComments = await scalar(
      `SELECT COUNT(*) FROM dbo.Comments WHERE ProblemID IS NOT NULL AND UserID IN (${idList})`,
    );
    if (!existingComments) {
      const root = (await scalar(
        `INSERT dbo.Comments (UserID, ProblemID, Content)
         VALUES (@u, @p, @c);
         SELECT CAST(SCOPE_IDENTITY() AS INT) AS id`,
        { u: legacyStudent(1), p: problemId.prime, c: "Gợi ý: chỉ cần kiểm tra ước đến căn bậc hai của n." },
      ))!;
      await q(
        `INSERT dbo.Comments (UserID, ProblemID, ParentID, Content) VALUES (@u, @p, @parent, @c)`,
        { u: legacyStudent(2), p: problemId.prime, parent: root, c: "Cảm ơn bạn, mình qua bài rồi!" },
      );
      for (const u of [teacher, ta]) {
        await q(`INSERT dbo.CommentLikes (CommentID, UserID) VALUES (@c, @u)`, { c: root, u });
      }
      await q(`INSERT dbo.Comments (UserID, ProblemID, Content) VALUES (@u, @p, @c)`, {
        u: legacyStudent(4),
        p: problemId.twosum,
        c: "Dùng hash map để đạt O(n) nhé.",
      });
    }

    // ---- Comments (kỳ thi) ----
    const existingCC = await scalar(
      `SELECT COUNT(*) FROM dbo.Comments WHERE ContestID IS NOT NULL AND UserID IN (${idList})`,
    );
    if (!existingCC) {
      const cc = (await scalar(
        `INSERT dbo.Comments (ContestID, UserID, Content)
         VALUES (@c, @u, @text);
         SELECT CAST(SCOPE_IDENTITY() AS INT) AS id`,
        { c: contestId.A, u: legacyStudent(1), text: "Đề năm nay vừa sức, bài 3 hơi khó." },
      ))!;
      await q(
        `INSERT dbo.Comments (ContestID, UserID, ParentID, Content) VALUES (@c, @u, @parent, @text)`,
        { c: contestId.A, u: teacher, parent: cc, text: "Cảm ơn góp ý, lời giải sẽ được đăng sớm." },
      );
      await q(`INSERT dbo.CommentLikes (CommentID, UserID) VALUES (@c, @u)`, {
        c: cc,
        u: legacyStudent(2),
      });
    }

    // ---- Notifications chung ----
    const existingNotif = await scalar(
      `SELECT COUNT(*) FROM dbo.Notifications WHERE UserID IN (${idList}) AND Type <> 'judge_result'`,
    );
    if (!existingNotif) {
      for (const s of [1, 2, 3]) {
        await q(
          `INSERT dbo.Notifications (UserID, Title, Body, Link, Type, IsRead)
           VALUES (@u, @title, @body, @link, 'contest_started', 0)`,
          {
            u: legacyStudent(s),
            title: "Kỳ thi đã bắt đầu",
            body: "Kỳ thi thực hành tuần 5 vừa bắt đầu.",
            link: `/user/contests/${contestId.B}`,
          },
        );
      }
      await q(
        `INSERT dbo.Notifications (UserID, Title, Body, Link, Type, IsRead)
         VALUES (@u, @title, @body, @link, 'class_student_added', 1)`,
        {
          u: legacyStudent(5),
          title: "Bạn đã được thêm vào lớp",
          body: "Nhập môn lập trình",
          link: `/user/classes/${classId.NMLT2026}`,
        },
      );
    }

    // ---- Bình luận, thông báo bổ sung (chỉ thêm khi `user2` chưa có bình luận) ----
    const existingExtraComments = await scalar(`SELECT COUNT(*) FROM dbo.Comments WHERE UserID = @u`, {
      u: userId.user2,
    });
    if (!existingExtraComments) {
      const teacher2 = userId.teacher2;
      const ta2 = userId.assist2;
      const addComment = async (
        target: { problem?: string; contest?: string },
        user: number,
        content: string,
        parent: number | null = null,
      ) =>
        (await scalar(
          `INSERT dbo.Comments (UserID, ProblemID, ContestID, ParentID, Content)
           VALUES (@u, @p, @c, @parent, @content);
           SELECT CAST(SCOPE_IDENTITY() AS INT) AS id`,
          {
            u: user,
            p: target.problem ? problemId[target.problem] : null,
            c: target.contest ? contestId[target.contest] : null,
            parent,
            content,
          },
        ))!;
      const like = (comment: number, user: number) =>
        q(`INSERT dbo.CommentLikes (CommentID, UserID) VALUES (@c, @u)`, { c: comment, u: user });

      const c1 = await addComment({ problem: "lis" }, student(2), "Bài này dùng O(n log n) với binary search được không ạ?");
      await addComment({ problem: "lis" }, teacher2, "Được, nhưng giới hạn n ≤ 2500 nên O(n^2) là đủ.", c1);
      await like(c1, student(1));
      await like(c1, ta2);
      const c2 = await addComment({ problem: "coin" }, student(1), "Chú ý trường hợp amount = 0 trả về 0.");
      await like(c2, student(2));
      await like(c2, teacher);
      await addComment({ problem: "fizz" }, student(2), "Nhớ kiểm tra bội của 15 trước khi xét 3 và 5.");
      const c3 = await addComment({ problem: "perm" }, student(1), "Kết quả không cần đúng thứ tự, mình thử itertools thì qua.");
      await addComment({ problem: "perm" }, ta2, "Đúng rồi, bài này chấm theo chế độ không phân biệt thứ tự.", c3);
      await like(c3, teacher2);
      await addComment({ problem: "average" }, student(2), "Sai số cho phép 1e-6 nên không cần làm tròn.");
      const c4 = await addComment({ contest: "G" }, student(2), "Bài lis khó nhất, mình chỉ ăn được nhóm 1 và 2.");
      await addComment({ contest: "G" }, teacher, "Nhóm 3 có test lớn, em xem lại độ phức tạp nhé.", c4);
      await like(c4, student(1));
      await addComment({ contest: "E" }, student(1), "Kỳ thi vừa sức, cảm ơn thầy.");
      await addComment({ contest: "F" }, student(2), "Mong có thêm kỳ thi mở như thế này.");

      for (const key of ["H"]) {
        for (const s of [1, 2]) {
          await q(
            `INSERT dbo.Notifications (UserID, Title, Body, Link, Type, IsRead)
             VALUES (@u, @title, @body, @link, 'contest_started', 0)`,
            {
              u: student(s),
              title: "Kỳ thi sắp diễn ra",
              body: "Kỳ thi giữa học kỳ II sẽ diễn ra trong 9 ngày tới.",
              link: `/user/contests/${contestId[key]}`,
            },
          );
        }
      }
      for (const [code, s] of [
        ["LTHDT2026", 1],
        ["THCB2026", 2],
        ["PYTHON2026", 2],
      ] as const) {
        await q(
          `INSERT dbo.Notifications (UserID, Title, Body, Link, Type, IsRead)
           VALUES (@u, @title, @body, @link, 'class_student_added', 1)`,
          {
            u: student(s),
            title: "Bạn đã được thêm vào lớp",
            body: extraClasses.find((c) => c.code === code)!.name,
            link: `/user/classes/${classId[code]}`,
          },
        );
      }
    }

    await tx.commit();
    console.log("Seed data ready.");
    console.log("  Accounts: admin, teacher, assist, user, teacher2, assist2, user2");
    console.log(`  Problems: ${allProblems.length}`);
    console.log(`  Classes:  ${legacyClasses.length + extraClasses.length}`);
    console.log(`  Contests: ${legacyContests.length + extraContests.length} (the upcoming kỳ thi C uses the seed password)`);
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    await pool.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
