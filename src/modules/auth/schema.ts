import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Email không hợp lệ");
const password = z.string().min(8, "Mật khẩu tối thiểu 8 ký tự");
const otp = z.string().regex(/^\d{6}$/, "Mã OTP gồm 6 chữ số");

export const requestRegisterOtpSchema = z.object({ email });

export const directRegisterSchema = z.object({
  username: z.string().trim().min(3).max(50),
  email: z.string().trim().email(),
  password: z.string().min(6),
  fullName: z.string().trim().min(2).max(100),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự"),
    email,
    password,
    confirmPassword: z.string(),
    otp,
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const requestResetOtpSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  email,
  otp,
  password,
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự"),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Vui lòng nhập mật khẩu cũ"),
    newPassword: password,
    confirmPassword: z.string().optional(),
  })
  .refine((v) => v.oldPassword !== v.newPassword, {
    message: "Mật khẩu mới phải khác mật khẩu cũ",
    path: ["newPassword"],
  })
  .refine((v) => !v.confirmPassword || v.newPassword === v.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export const adminListUsersQuerySchema = z.object({
  q: z.string().trim().optional(),
  role: z.enum(["User", "Teacher", "Admin", "TA"]).optional(),
  status: z.enum(["Active", "Locked"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(20),
});

export const setUserStatusSchema = z.object({
  userId: z.coerce.number().int().positive("ID người dùng không hợp lệ"),
  status: z.enum(["Active", "Locked"], { message: "Trạng thái không hợp lệ" }),
});

export const setUserRoleSchema = z.object({
  userId: z.coerce.number().int().positive("ID người dùng không hợp lệ"),
  role: z.enum(["User", "TA", "Teacher"], { message: "Vai trò không hợp lệ" }),
});

