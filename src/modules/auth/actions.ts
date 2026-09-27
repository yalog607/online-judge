"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, readSession, SESSION_TTL_MS } from "@/lib/session";
import { requireUser } from "@/lib/dal";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  requestRegisterOtpSchema,
  requestResetOtpSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "./schema";
import * as service from "./service";
import { AuthError } from "./service";
import { createDbSession, getUserById, revokeDbSession, validateImpersonate } from "./repo";

export type FormState = { error?: string; ok?: boolean };

async function startSession(userId: number, actorId?: number) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const sessionId = await createDbSession(userId, expiresAt, actorId);
  await createSession(sessionId, actorId);
}

export async function requestRegisterOtpAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = requestRegisterOtpSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await service.requestRegisterOtp(parsed.data.email);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Không gửi được mã OTP." };
  }
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await service.register(parsed.data);
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Đăng ký thất bại." };
  }
  redirect("/login");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let user;
  try {
    user = await service.login(parsed.data.email, parsed.data.password);
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Đăng nhập thất bại." };
  }
  await startSession(user.UserID);
  redirect(user.Role === "Admin" ? "/admin" : user.Role === "Teacher" ? "/teacher" : "/user");
}

export async function logoutAction() {
  const session = await readSession();
  if (session) await revokeDbSession(session.sessionId);
  await destroySession();
  redirect("/login");
}

export async function requestResetOtpAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = requestResetOtpSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await service.requestResetOtp(parsed.data.email);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Không gửi được mã OTP." };
  }
}

export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await service.resetPassword(parsed.data);
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Đổi mật khẩu thất bại." };
  }
  redirect("/login");
}

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = updateProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let avatarUrl: string | undefined;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (avatar.size > 2 * 1024 * 1024) return { error: "Ảnh đại diện tối đa 2MB." };
    const { uploadFile } = await import("@/lib/storage");
    avatarUrl = await uploadFile(Buffer.from(await avatar.arrayBuffer()), "itoj/avatars");
  }

  await service.repo.updateProfile(user.userId, parsed.data.fullName, avatarUrl);
  return { ok: true };
}

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await service.changePassword(user.userId, parsed.data.oldPassword, parsed.data.newPassword);
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Đổi mật khẩu thất bại." };
  }
  return { ok: true };
}

export async function impersonateAction(targetUserId: number) {
  const actor = await requireUser();
  const allowed = await validateImpersonate(actor.userId, targetUserId);
  if (!allowed) throw new Error("Không có quyền mô phỏng người dùng này.");
  const oldSession = await readSession();
  if (oldSession) await revokeDbSession(oldSession.sessionId);
  await startSession(targetUserId, actor.userId);
  redirect("/user");
}

export async function endImpersonationAction() {
  const session = await readSession();
  if (!session?.actorId) redirect("/user");

  const actor = await getUserById(session.actorId);
  await revokeDbSession(session.sessionId);
  if (!actor) {
    await destroySession();
    redirect("/login");
  }
  await startSession(actor.UserID);
  redirect(actor.Role === "Admin" ? "/admin" : actor.Role === "Teacher" ? "/teacher" : "/user");
}
