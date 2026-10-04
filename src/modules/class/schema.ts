import { z } from "zod";

export const createClassSchema = z.object({
  className: z.string().trim().min(3, "Tên lớp phải có ít nhất 3 ký tự").max(150),
  description: z.string().trim().max(1000).optional(),
  isPublic: z.boolean().default(true),
  inviteCode: z.string().trim().max(20).optional(),
});

export const joinClassSchema = z.object({
  inviteCode: z.string().trim().min(1, "Vui lòng nhập mã tham gia lớp").max(20),
});

export const listClassQuerySchema = z.object({
  search: z.string().trim().optional(),
  onlyMine: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20)),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type JoinClassInput = z.infer<typeof joinClassSchema>;
