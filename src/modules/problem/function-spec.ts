import { z } from "zod";

// Pure module (no server-only): shared by the web app, the teacher form and the judge worker.

export const BASE_TYPES = ["int", "long", "double", "bool", "string"] as const;
export type BaseType = (typeof BASE_TYPES)[number];

export const FUNCTION_TYPES = BASE_TYPES.flatMap((b) => [b, `${b}[]`, `${b}[][]`]);

export const MAX_PARAMS = 8;

export const functionSpecSchema = z
  .object({
    name: z
      .string()
      .trim()
      .regex(/^[A-Za-z_][A-Za-z0-9_]{0,63}$/, "Tên hàm chỉ gồm chữ, số, dấu gạch dưới và không bắt đầu bằng số"),
    params: z
      .array(
        z.object({
          name: z
            .string()
            .trim()
            .regex(/^[A-Za-z_][A-Za-z0-9_]{0,63}$/, "Tên tham số không hợp lệ"),
          type: z.string().refine((t) => FUNCTION_TYPES.includes(t), "Kiểu dữ liệu không được hỗ trợ"),
        }),
      )
      .min(1, "Cần ít nhất một tham số")
      .max(MAX_PARAMS, `Tối đa ${MAX_PARAMS} tham số`),
    returns: z.string().refine((t) => FUNCTION_TYPES.includes(t), "Kiểu trả về không được hỗ trợ"),
  })
  .superRefine((spec, ctx) => {
    const seen = new Set<string>();
    for (const p of spec.params) {
      if (seen.has(p.name)) ctx.addIssue({ code: "custom", message: `Tham số "${p.name}" bị trùng` });
      seen.add(p.name);
    }
  });

export type FunctionSpec = z.infer<typeof functionSpecSchema>;

export function parseFunctionSpec(raw: string | null | undefined): FunctionSpec | null {
  if (!raw) return null;
  try {
    const parsed = functionSpecSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function splitType(type: string): { base: BaseType; dims: 0 | 1 | 2 } {
  const dims = (type.match(/\[\]/g) ?? []).length as 0 | 1 | 2;
  return { base: type.replace(/\[\]/g, "") as BaseType, dims };
}

const INT_MIN = -2147483648;
const INT_MAX = 2147483647;

function checkValue(type: string, value: unknown): boolean {
  const { base, dims } = splitType(type);
  if (dims > 0) {
    return Array.isArray(value) && value.every((v) => checkValue(type.slice(0, -2), v));
  }
  switch (base) {
    case "int":
      return typeof value === "number" && Number.isInteger(value) && value >= INT_MIN && value <= INT_MAX;
    case "long":
      return typeof value === "number" && Number.isSafeInteger(value);
    case "double":
      return typeof value === "number" && Number.isFinite(value);
    case "bool":
      return typeof value === "boolean";
    case "string":
      return typeof value === "string";
  }
}

// Testcase input: one JSON value per line, one line per parameter, in parameter order.
export function splitInputLines(input: string): string[] {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\n+$/, "")
    .split("\n");
}

export function validateFunctionTestcase(
  spec: FunctionSpec,
  input: string,
  expectedOutput: string,
): string | null {
  const lines = splitInputLines(input);
  if (lines.length !== spec.params.length) {
    return `Input cần đúng ${spec.params.length} dòng (mỗi tham số một dòng JSON), hiện có ${lines.length}`;
  }
  for (let i = 0; i < spec.params.length; i++) {
    const p = spec.params[i];
    let value: unknown;
    try {
      value = JSON.parse(lines[i]);
    } catch {
      return `Tham số "${p.name}" không phải JSON hợp lệ`;
    }
    if (!checkValue(p.type, value)) return `Tham số "${p.name}" không đúng kiểu ${p.type}`;
  }
  let expected: unknown;
  try {
    expected = JSON.parse(expectedOutput);
  } catch {
    return "Output mong đợi không phải JSON hợp lệ";
  }
  if (!checkValue(spec.returns, expected)) return `Output mong đợi không đúng kiểu ${spec.returns}`;
  return null;
}
