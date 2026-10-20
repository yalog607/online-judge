import { z } from "zod";
import { MAX_SOURCE_BYTES } from "@/modules/submission/limits";

export const DIFFICULTY_LABEL: Record<string, string> = {
  Easy: "Dễ",
  Medium: "Trung bình",
  Hard: "Khó",
};

export const problemFormSchema = z.object({
  title: z.string().trim().min(3, "Tên bài tập tối thiểu 3 ký tự").max(200),
  statement: z.string().trim().min(10, "Đề bài quá ngắn"),
  inputFormat: z.string().trim().optional(),
  outputFormat: z.string().trim().optional(),
  timeLimit: z.coerce.number().int().positive().max(20000),
  memoryLimit: z.coerce.number().int().positive().max(2048),
  tags: z
    .string()
    .trim()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .join(",")
        : undefined,
    ),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  status: z.enum(["Public", "Private", "Hidden", "Pending", "Rejected"]).default("Public"),
  proposedStatus: z.enum(["Public", "Private"]).optional(),
  classId: z
    .preprocess(
      (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
      z.number().int().positive().optional(),
    ),
  dueDate: z
    .preprocess(
      (val) => (val === "" || val === undefined || val === null ? undefined : String(val)),
      z.string().optional(),
    ),
});

export const testcaseInputSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
  isHidden: z.boolean(),
});

export const submitCodeSchema = z.object({
  problemId: z.coerce.number().int().positive(),
  language: z.enum(["cpp", "c", "java", "python", "javascript", "go", "csharp"]),
  sourceCode: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập mã nguồn")
    .refine((v) => new TextEncoder().encode(v).length <= MAX_SOURCE_BYTES, {
      message: `Mã nguồn tối đa ${MAX_SOURCE_BYTES / 1024}KB.`,
    }),
  contestId: z.coerce.number().int().positive().optional(),
  classId: z.coerce.number().int().positive().optional(),
});

export const COMPARE_MODES = ["exact", "unordered", "float"] as const;
export type CompareMode = (typeof COMPARE_MODES)[number];

// Checker settings and testcase groups saved together with the testcases.
export const scoringSchema = z
  .object({
    compareMode: z.enum(COMPARE_MODES).default("exact"),
    floatEpsilon: z.number().positive().max(1).optional(),
    groups: z
      .array(
        z.object({
          groupNo: z.number().int().positive(),
          points: z.number().int().min(0).max(1000),
        }),
      )
      .max(100)
      .default([]),
  })
  .refine((v) => new Set(v.groups.map((g) => g.groupNo)).size === v.groups.length, {
    message: "Số nhóm testcase bị trùng",
    path: ["groups"],
  });

export type Scoring = z.infer<typeof scoringSchema>;

// Returns an error message when a testcase points to a group that has no declared points.
// Callers validate with scoringSchema first, then run this before saving.
export function validateTestcaseGroups(
  testcases: { groupNo?: number }[],
  scoring: Scoring,
): string | null {
  const declared = new Set(scoring.groups.map((g) => g.groupNo));
  const bad = testcases.findIndex((t) => t.groupNo !== undefined && !declared.has(t.groupNo));
  return bad >= 0 ? `Testcase #${bad + 1} thuộc nhóm chưa khai báo điểm` : null;
}
