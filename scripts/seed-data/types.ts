import type { FunctionSpec } from "../../src/modules/problem/function-spec";

export type Tc = {
  input: string[];
  expected: string;
  hidden: boolean;
  // Nhóm chấm điểm (chỉ dùng khi bài có `groups`).
  g?: number;
};

export type SampleProblem = {
  key: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  status: "Public" | "Private" | "Hidden" | "Pending" | "Rejected";
  tags: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  spec: FunctionSpec;
  testcases: Tc[];
  creator?: "teacher" | "teacher2";
  compareMode?: "exact" | "unordered" | "float";
  floatEpsilon?: number;
  groups?: { groupNo: number; points: number }[];
  rejectionReason?: string;
  proposedStatus?: "Public" | "Private";
  // Lời giải Python đúng; nếu có thì sinh các mã sai/TLE/RE từ chữ ký hàm.
  ok?: string;
};

export type ClassDef = {
  code: string;
  name: string;
  description: string;
  isPublic: number;
  teacher: "teacher" | "teacher2";
  ta: "assist" | "assist2";
  students: number[];
  problems: { key: string; due: number | null }[];
  approval?: "Approved" | "Pending" | "Rejected";
  rejectionReason?: string;
  cancelled?: boolean;
};

export type ContestDef = {
  key: string;
  name: string;
  description: string;
  // phút so với thời điểm chạy seed
  start: number;
  end: number;
  password: string | null;
  classCode: string | null;
  creator?: "teacher" | "teacher2";
  problems: [string, number][];
  participants: number[];
};

export type Verdict = "AC" | "WA" | "TLE" | "RE" | "CE";

export type Sub = {
  student: number;
  problem: string;
  verdict: Verdict;
  contest?: string;
  // phút so với thời điểm chạy seed (âm = đã qua)
  at: number;
  lang?: "python" | "cpp";
};

// Sinh mã sai/lặp/lỗi từ chữ ký hàm khi bài chỉ cung cấp lời giải đúng.
export function badSources(spec: FunctionSpec, ok: string) {
  const args = spec.params.map((p) => p.name).join(", ");
  const head = `def ${spec.name}(${args}):\n`;
  return {
    ok,
    wrong: `${head}    return None\n`,
    loop: `${head}    while True:\n        pass\n`,
    crash: `${head}    return 1 // 0\n`,
  };
}
