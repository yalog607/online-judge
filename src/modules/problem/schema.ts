import { z } from "zod";

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
});

export const testcaseInputSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
  isHidden: z.boolean(),
});

export const submitCodeSchema = z.object({
  problemId: z.coerce.number().int().positive(),
  language: z.enum(["cpp", "c", "java", "python", "javascript", "go", "csharp"]),
  sourceCode: z.string().trim().min(1, "Vui lòng nhập mã nguồn"),
  contestId: z.coerce.number().int().positive().optional(),
});
