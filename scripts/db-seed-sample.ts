import "dotenv/config";
import bcrypt from "bcryptjs";
import sql from "mssql";
import { env } from "../src/lib/env";
import { validateFunctionTestcase, type FunctionSpec } from "../src/modules/problem/function-spec";

// Bộ dữ liệu mẫu để test bản deploy. Idempotent: chạy lại không nhân đôi dữ liệu.
// Mọi bản ghi đều có dấu hiệu nhận biết: user `sample_*`, tiêu đề/tên `[Mẫu] ...`, mã lớp `SAMPLE0x`.
// Lưu ý: trigger chặn xóa bài nộp, nên script này chỉ thêm dữ liệu, không có chế độ xóa.

const PASSWORD = "Password@123";
const CONTEST_PASSWORD = "sample123";

type Tc = { input: string[]; expected: string; hidden: boolean };
type SampleProblem = {
  key: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  status: "Public" | "Private" | "Hidden";
  tags: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  spec: FunctionSpec;
  testcases: Tc[];
};

const problems: SampleProblem[] = [
  {
    key: "sum",
    title: "[Mẫu] Tổng hai số",
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
    title: "[Mẫu] Kiểm tra số nguyên tố",
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
    title: "[Mẫu] Đảo ngược chuỗi",
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
    title: "[Mẫu] Tổng dãy con lớn nhất",
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
    title: "[Mẫu] Hai số có tổng bằng target",
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
    title: "[Mẫu] Đếm đường đi trong lưới",
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
    title: "[Mẫu] Fibonacci (bài riêng tư)",
    difficulty: "Easy",
    status: "Private",
    tags: "math,dp",
    statement: "Bài mẫu trạng thái Riêng tư. Viết hàm `fib(n)` trả về số Fibonacci thứ n (fib(0)=0, fib(1)=1).",
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
    title: "[Mẫu] Giai thừa (bài bị khóa)",
    difficulty: "Easy",
    status: "Hidden",
    tags: "math",
    statement: "Bài mẫu trạng thái Hidden (bị khóa). Viết hàm `factorial(n)` trả về n!.",
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
const COMPILE_ERROR_SRC = "def broken(:\n    return\n";

type Verdict = "AC" | "WA" | "TLE" | "RE" | "CE";
type Sub = {
  student: number; // 1..6
  problem: string;
  verdict: Verdict;
  contest?: "A" | "B";
  // phút so với thời điểm chạy seed (âm = đã qua)
  at: number;
  lang?: "python" | "cpp";
};

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
  for (const p of problems) {
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
      { username: "sample_teacher", fullName: "Giảng viên Mẫu", role: "Teacher" },
      { username: "sample_ta", fullName: "Trợ giảng Mẫu", role: "TA" },
      ...[1, 2, 3, 4, 5, 6].map((i) => ({
        username: `sample_student${i}`,
        fullName: `Học viên Mẫu ${i}`,
        role: "User",
      })),
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
    const teacher = userId.sample_teacher;
    const ta = userId.sample_ta;
    const student = (i: number) => userId[`sample_student${i}`];

    // ---- Problems + testcases ----
    const problemId: Record<string, number> = {};
    for (const p of problems) {
      let id = await scalar(
        `SELECT ProblemID FROM dbo.Problems WHERE CreatorID = @creator AND Title = @title`,
        { creator: teacher, title: p.title },
      );
      if (id === undefined) {
        id = await scalar(
          `INSERT dbo.Problems (CreatorID, Title, Statement, InputFormat, OutputFormat, TimeLimit, MemoryLimit, Tags, Difficulty, Status, FunctionSpec)
           VALUES (@creator, @title, @statement, @inputFormat, @outputFormat, 1000, 256, @tags, @difficulty, @status, @spec);
           SELECT CAST(SCOPE_IDENTITY() AS INT) AS id`,
          {
            creator: teacher,
            title: p.title,
            statement: p.statement,
            inputFormat: p.inputFormat,
            outputFormat: p.outputFormat,
            tags: p.tags,
            difficulty: p.difficulty,
            status: p.status,
            spec: JSON.stringify(p.spec),
          },
        );
      }
      problemId[p.key] = id!;
      const hasTests = await scalar(`SELECT COUNT(*) FROM dbo.Testcases WHERE ProblemID = @id`, { id });
      if (!hasTests) {
        for (const [i, tc] of p.testcases.entries()) {
          await q(
            `INSERT dbo.Testcases (ProblemID, InputData, ExpectedOutput, IsHidden, OrderIndex)
             VALUES (@id, @input, @expected, @hidden, @order)`,
            { id, input: tc.input.join("\n"), expected: tc.expected, hidden: tc.hidden, order: i + 1 },
          );
        }
      }
    }

    // ---- Classes ----
    const classDefs = [
      {
        code: "SAMPLE01",
        name: "[Mẫu] Nhập môn lập trình",
        description: "Lớp công khai dùng để test: có trợ giảng, bài tập còn hạn và quá hạn.",
        isPublic: 1,
        students: [1, 2, 3, 4, 5],
        problems: [
          { key: "sum", due: 7 * 24 * 60 },
          { key: "prime", due: 14 * 24 * 60 },
          { key: "reverse", due: -2 * 24 * 60 },
        ],
      },
      {
        code: "SAMPLE02",
        name: "[Mẫu] Cấu trúc dữ liệu và giải thuật",
        description: "Lớp riêng tư (vào bằng mã mời SAMPLE02) dùng để test.",
        isPublic: 0,
        students: [3, 4, 5, 6],
        problems: [
          { key: "maxsub", due: 10 * 24 * 60 },
          { key: "twosum", due: 10 * 24 * 60 },
          { key: "paths", due: null },
        ],
      },
    ];
    const classId: Record<string, number> = {};
    for (const c of classDefs) {
      let id = await scalar(`SELECT ClassID FROM dbo.Classes WHERE InviteCode = @code`, { code: c.code });
      if (id === undefined) {
        id = await scalar(
          `INSERT dbo.Classes (TeacherID, InviteCode, ClassName, Description, IsPublic, ApprovalStatus)
           VALUES (@teacher, @code, @name, @description, @isPublic, 'Approved');
           SELECT CAST(SCOPE_IDENTITY() AS INT) AS id`,
          { teacher, code: c.code, name: c.name, description: c.description, isPublic: c.isPublic },
        );
      }
      classId[c.code] = id!;
      for (const s of c.students) {
        await q(
          `IF NOT EXISTS (SELECT 1 FROM dbo.Class_Student WHERE ClassID = @id AND UserID = @u)
             INSERT dbo.Class_Student (ClassID, UserID) VALUES (@id, @u)`,
          { id, u: student(s) },
        );
      }
      await q(
        `IF NOT EXISTS (SELECT 1 FROM dbo.Class_TA WHERE ClassID = @id AND UserID_TA = @ta)
           INSERT dbo.Class_TA (ClassID, UserID_TA) VALUES (@id, @ta)`,
        { id, ta },
      );
      for (const cp of c.problems) {
        // AssignedDate đặt sớm hơn hạn nộp để thỏa CK_CP_Due kể cả với bài quá hạn.
        await q(
          `IF NOT EXISTS (SELECT 1 FROM dbo.Class_Problem WHERE ClassID = @id AND ProblemID = @p)
             INSERT dbo.Class_Problem (ClassID, ProblemID, AssignedDate, DueDate)
             VALUES (@id, @p, DATEADD(DAY, -14, SYSUTCDATETIME()),
                     CASE WHEN @due IS NULL THEN NULL ELSE DATEADD(MINUTE, CAST(@due AS INT), SYSUTCDATETIME()) END)`,
          { id, p: problemId[cp.key], due: cp.due },
        );
      }
    }
    await q(
      `IF NOT EXISTS (SELECT 1 FROM dbo.Documents WHERE ClassID = @id AND FileName = @name)
         INSERT dbo.Documents (ClassID, FileName, CloudinaryURL, Category)
         VALUES (@id, @name, 'https://example.com/itoj-sample/bai-giang-1.pdf', N'Bài giảng')`,
      { id: classId.SAMPLE01, name: "[Mẫu] Bài giảng tuần 1 (liên kết giả).pdf" },
    );

    // ---- Contests ----
    const contestDefs = [
      {
        key: "A",
        name: "[Mẫu] Kỳ thi giữa kỳ (đã kết thúc)",
        description: "Kỳ thi đã kết thúc, có bảng xếp hạng.",
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
        name: "[Mẫu] Kỳ thi đang diễn ra",
        description: "Kỳ thi đang diễn ra, gắn với lớp SAMPLE01.",
        start: B0,
        end: B0 + 300,
        password: null,
        classCode: "SAMPLE01",
        problems: [
          ["prime", 100],
          ["reverse", 150],
          ["twosum", 250],
        ] as [string, number][],
        participants: [1, 2, 3],
      },
      {
        key: "C",
        name: "[Mẫu] Kỳ thi sắp diễn ra (có mật khẩu)",
        description: `Kỳ thi sắp diễn ra, mật khẩu: ${CONTEST_PASSWORD}.`,
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
    for (const c of contestDefs) {
      let id = await scalar(
        `SELECT ContestID FROM dbo.Contests WHERE CreatorID = @teacher AND ContestName = @name`,
        { teacher, name: c.name },
      );
      if (id === undefined) {
        id = await scalar(
          `INSERT dbo.Contests (CreatorID, ContestName, Description, StartTime, EndTime, [Password], ClassID)
           VALUES (@teacher, @name, @description,
                   DATEADD(MINUTE, CAST(@start AS INT), SYSUTCDATETIME()), DATEADD(MINUTE, CAST(@end AS INT), SYSUTCDATETIME()),
                   @password, @classId);
           SELECT CAST(SCOPE_IDENTITY() AS INT) AS id`,
          {
            teacher,
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
          { id, u: student(s) },
        );
      }
    }

    // ---- Submissions (chỉ thêm khi chưa có bài nộp mẫu nào) ----
    const sampleIds = Object.values(userId);
    const idList = sampleIds.join(",");
    const existingSubs = await scalar(
      `SELECT COUNT(*) FROM dbo.Submissions WHERE UserID IN (${idList})`,
    );
    const subIds: number[] = [];
    if (!existingSubs) {
      const ordered = [...subs].sort((a, b) => a.at - b.at);
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
        const tcs = await q<{ TestCaseID: number }>(
          `SELECT TestCaseID FROM dbo.Testcases WHERE ProblemID = @p ORDER BY OrderIndex`,
          { p: problemId[s.problem] },
        );
        const total = tcs.length;
        // Số testcase qua: AC = tất cả; CE = 0; WA/TLE/RE dừng ở một testcase giữa chừng.
        const passed = s.verdict === "AC" ? total : s.verdict === "CE" ? 0 : Math.max(1, Math.floor(total / 2));
        const runtime = s.verdict === "TLE" ? 1000 : s.verdict === "CE" ? null : 20 + ((s.at * 7) & 63);
        const memory = s.verdict === "CE" ? null : 8 + ((Math.abs(s.at) * 3) % 20);

        const id = (await scalar(
          `INSERT dbo.Submissions (UserID, ProblemID, ContestID, SourceCode, Language, SubmitTime, Result)
           VALUES (@u, @p, @c, @code, @lang, DATEADD(MINUTE, CAST(@at AS INT), SYSUTCDATETIME()), 'Pending');
           SELECT CAST(SCOPE_IDENTITY() AS INT) AS id`,
          {
            u: student(s.student),
            p: problemId[s.problem],
            c: s.contest ? contestId[s.contest] : null,
            code,
            lang,
            at: s.at,
          },
        ))!;
        subIds.push(id);

        // Đổi Pending -> kết quả cuối bằng UPDATE để trigger bảng xếp hạng kỳ thi tự tính.
        await q(
          `UPDATE dbo.Submissions
              SET Result = @result, Runtime = @runtime, Memory = @memory,
                  PassedCases = @passed, JudgedAt = DATEADD(SECOND, 5, SubmitTime)
            WHERE SubmissionID = @id`,
          { id, result: s.verdict, runtime, memory, passed: `${passed}/${total}` },
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

      // Thông báo kết quả chấm cho một vài bài nộp.
      for (const [idx, s] of ordered.entries()) {
        if (!["AC", "WA"].includes(s.verdict) || idx % 3 !== 0) continue;
        await q(
          `INSERT dbo.Notifications (UserID, Title, Body, Link, Type, IsRead)
           VALUES (@u, @title, @body, @link, 'judge_result', 0)`,
          {
            u: student(s.student),
            title: `Kết quả chấm: ${s.verdict}`,
            body: `Bài nộp của bạn cho "${problems.find((p) => p.key === s.problem)!.title}" đã được chấm.`,
            link: `/submissions/${subIds[idx]}`,
          },
        );
      }
    }

    // ---- Comments (bài tập) ----
    const existingComments = await scalar(
      `SELECT COUNT(*) FROM dbo.Comments WHERE UserID IN (${idList})`,
    );
    if (!existingComments) {
      const root = (await scalar(
        `INSERT dbo.Comments (UserID, ProblemID, Content, Likes)
         VALUES (@u, @p, @c, 2);
         SELECT CAST(SCOPE_IDENTITY() AS INT) AS id`,
        { u: student(1), p: problemId.prime, c: "Gợi ý: chỉ cần kiểm tra ước đến căn bậc hai của n." },
      ))!;
      await q(
        `INSERT dbo.Comments (UserID, ProblemID, ParentID, Content) VALUES (@u, @p, @parent, @c)`,
        { u: student(2), p: problemId.prime, parent: root, c: "Cảm ơn bạn, mình qua bài rồi!" },
      );
      for (const s of [2, 3]) {
        await q(`INSERT dbo.CommentLikes (CommentID, UserID) VALUES (@c, @u)`, {
          c: root,
          u: student(s),
        });
      }
      await q(`INSERT dbo.Comments (UserID, ProblemID, Content) VALUES (@u, @p, @c)`, {
        u: student(4),
        p: problemId.twosum,
        c: "Dùng hash map để đạt O(n) nhé.",
      });
    }

    // ---- Comments (kỳ thi) ----
    const existingCC = await scalar(
      `SELECT COUNT(*) FROM dbo.ContestComments WHERE UserID IN (${idList})`,
    );
    if (!existingCC) {
      const cc = (await scalar(
        `INSERT dbo.ContestComments (ContestID, UserID, Content)
         VALUES (@c, @u, @text);
         SELECT CAST(SCOPE_IDENTITY() AS INT) AS id`,
        { c: contestId.A, u: student(1), text: "Đề năm nay vừa sức, bài 3 hơi khó." },
      ))!;
      await q(
        `INSERT dbo.ContestComments (ContestID, UserID, ParentID, Content) VALUES (@c, @u, @parent, @text)`,
        { c: contestId.A, u: teacher, parent: cc, text: "Cảm ơn góp ý, lời giải sẽ được đăng sớm." },
      );
      await q(`INSERT dbo.ContestCommentLikes (CommentID, UserID) VALUES (@c, @u)`, {
        c: cc,
        u: student(2),
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
            u: student(s),
            title: "Kỳ thi đã bắt đầu",
            body: "[Mẫu] Kỳ thi đang diễn ra vừa bắt đầu.",
            link: `/user/contests/${contestId.B}`,
          },
        );
      }
      await q(
        `INSERT dbo.Notifications (UserID, Title, Body, Link, Type, IsRead)
         VALUES (@u, @title, @body, @link, 'class_student_added', 1)`,
        {
          u: student(5),
          title: "Bạn đã được thêm vào lớp",
          body: "[Mẫu] Nhập môn lập trình",
          link: `/user/classes/${classId.SAMPLE01}`,
        },
      );
    }

    await tx.commit();
    console.log("Sample data ready.");
    console.log(`  Accounts: sample_teacher, sample_ta, sample_student1..6 (password: ${PASSWORD})`);
    console.log(`  Classes:  SAMPLE01 (public), SAMPLE02 (private)`);
    console.log(`  Contests: 3 (ended / ongoing / upcoming, password of the last: ${CONTEST_PASSWORD})`);
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
