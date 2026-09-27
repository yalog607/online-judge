import "server-only";
import bcrypt from "bcryptjs";
import { DomainError } from "@/db/exec";
import { sendOtpMail } from "@/lib/mail";
import * as repo from "./repo";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function randomOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export class AuthError extends Error {}

async function issueOtp(email: string, purpose: "Register" | "Reset", payload?: string) {
  const code = randomOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  try {
    await repo.requestOtp({ email, purpose, codeHash, expiresAt, payload });
  } catch (e) {
    if (e instanceof DomainError) throw new AuthError(e.message);
    throw e;
  }
  await sendOtpMail(email, code, purpose);
}

export function requestRegisterOtp(email: string) {
  return issueOtp(email, "Register");
}

export function requestResetOtp(email: string) {
  return issueOtp(email, "Reset");
}

async function verifyOtp(email: string, purpose: "Register" | "Reset", code: string) {
  const otp = await repo.getOtp(email, purpose);
  if (!otp) throw new AuthError("Mã OTP không hợp lệ hoặc đã hết hạn.");
  if (otp.Attempts >= MAX_OTP_ATTEMPTS) throw new AuthError("Bạn đã nhập sai quá nhiều lần.");
  if (new Date(otp.ExpiresAt).getTime() < Date.now())
    throw new AuthError("Mã OTP đã hết hạn, vui lòng yêu cầu mã mới.");

  const ok = await bcrypt.compare(code, otp.CodeHash);
  if (!ok) {
    await repo.registerOtpAttempt(otp.OtpID);
    throw new AuthError("Mã OTP không đúng.");
  }
  return otp.OtpID;
}

function deriveUsername(email: string): string {
  return (
    email
      .split("@")[0]
      .replace(/[^a-zA-Z0-9_.]/g, "")
      .slice(0, 40) + Date.now().toString(36)
  );
}

export async function register(input: {
  email: string;
  fullName: string;
  password: string;
  otp: string;
}) {
  const otpId = await verifyOtp(input.email, "Register", input.otp);
  const passwordHash = await bcrypt.hash(input.password, 10);
  try {
    return await repo.consumeOtpAndRegister({
      otpId,
      email: input.email,
      username: deriveUsername(input.email),
      passwordHash,
      fullName: input.fullName,
    });
  } catch (e) {
    if (e instanceof DomainError) throw new AuthError(e.message);
    throw e;
  }
}

export async function resetPassword(input: { email: string; otp: string; password: string }) {
  const otpId = await verifyOtp(input.email, "Reset", input.otp);
  const passwordHash = await bcrypt.hash(input.password, 10);
  await repo.consumeOtpAndResetPassword({ otpId, email: input.email, passwordHash });
}

export async function login(email: string, password: string) {
  const user = await repo.getUserByEmail(email);
  if (!user) throw new AuthError("Email hoặc mật khẩu không đúng.");
  const ok = await bcrypt.compare(password, user.Password);
  if (!ok) throw new AuthError("Email hoặc mật khẩu không đúng.");
  if (user.Status === "Locked") throw new AuthError("Tài khoản đã bị khóa.");
  return user;
}

export async function changePassword(userId: number, oldPassword: string, newPassword: string) {
  const user = await repo.getUserById(userId);
  if (!user) throw new AuthError("Không tìm thấy người dùng.");
  const ok = await bcrypt.compare(oldPassword, user.Password);
  if (!ok) throw new AuthError("Mật khẩu cũ không đúng.");
  await repo.changePassword(userId, await bcrypt.hash(newPassword, 10));
}

export { repo };
