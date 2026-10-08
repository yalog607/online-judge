import "server-only";
import { execProc } from "@/db/exec";
import type { Role } from "@/lib/session";

export type UserRow = {
  UserID: number;
  Username: string;
  Password: string;
  Email: string;
  FullName: string;
  Role: Role;
  Status: "Active" | "Locked";
  Avatar: string | null;
};

type OtpRow = {
  OtpID: number;
  CodeHash: string;
  Payload: string | null;
  Attempts: number;
  ExpiresAt: string;
};

export async function requestOtp(input: {
  email: string;
  purpose: "Register" | "Reset";
  codeHash: string;
  expiresAt: Date;
  payload?: string;
}): Promise<number> {
  const { rows } = await execProc<{ OtpID: number }>("usp_Auth_RequestOtp", {
    Email: input.email,
    Purpose: input.purpose,
    CodeHash: input.codeHash,
    ExpiresAt: input.expiresAt,
    Payload: input.payload ?? null,
  });
  return rows[0].OtpID;
}

export async function getOtp(email: string, purpose: "Register" | "Reset") {
  const { rows } = await execProc<OtpRow>("usp_Auth_GetOtp", { Email: email, Purpose: purpose });
  return rows[0] ?? null;
}

export async function registerOtpAttempt(otpId: number) {
  await execProc("usp_Auth_RegisterOtpAttempt", { OtpID: otpId });
}

export async function consumeOtpAndRegister(input: {
  otpId: number;
  email: string;
  username: string;
  passwordHash: string;
  fullName: string;
}): Promise<number> {
  const { rows } = await execProc<{ UserID: number }>("usp_Auth_ConsumeOtpAndRegister", {
    OtpID: input.otpId,
    Email: input.email,
    Username: input.username,
    PasswordHash: input.passwordHash,
    FullName: input.fullName,
  });
  return rows[0].UserID;
}

export async function consumeOtpAndResetPassword(input: {
  otpId: number;
  email: string;
  passwordHash: string;
}) {
  await execProc("usp_Auth_ConsumeOtpAndResetPassword", {
    OtpID: input.otpId,
    Email: input.email,
    PasswordHash: input.passwordHash,
  });
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const { rows } = await execProc<UserRow>("usp_Auth_GetUserByEmail", { Email: email });
  return rows[0] ?? null;
}

export async function getUserById(userId: number): Promise<UserRow | null> {
  const { rows } = await execProc<UserRow>("usp_Auth_GetUserById", { UserID: userId });
  return rows[0] ?? null;
}

export async function updateProfile(userId: number, fullName: string, avatar?: string) {
  await execProc("usp_Auth_UpdateProfile", {
    UserID: userId,
    FullName: fullName,
    Avatar: avatar ?? null,
  });
}

export async function changePassword(userId: number, passwordHash: string) {
  await execProc("usp_Auth_ChangePassword", { UserID: userId, NewPasswordHash: passwordHash });
}

export async function createDbSession(
  userId: number,
  expiresAt: Date,
  actorId?: number,
): Promise<string> {
  const { rows } = await execProc<{ SessionID: string }>("usp_Session_Create", {
    UserID: userId,
    ActorID: actorId ?? null,
    ExpiresAt: expiresAt,
  });
  return rows[0].SessionID;
}

export async function revokeDbSession(sessionId: string) {
  await execProc("usp_Session_Revoke", { SessionID: sessionId });
}

export async function setUserStatus(actorId: number, userId: number, status: "Active" | "Locked") {
  await execProc("usp_Admin_SetUserStatus", { ActorID: actorId, UserID: userId, Status: status });
}

export async function validateImpersonate(actorId: number, targetUserId: number) {
  const { rows } = await execProc<{ Allowed: boolean }>("usp_Admin_ValidateImpersonate", {
    ActorID: actorId,
    TargetUserID: targetUserId,
  });
  return Boolean(rows[0]?.Allowed);
}

export async function registerDirect(input: {
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
}): Promise<number> {
  const { rows } = await execProc<{ UserID: number }>("usp_Auth_RegisterDirect", {
    Username: input.username,
    Email: input.email,
    PasswordHash: input.passwordHash,
    FullName: input.fullName,
  });
  return rows[0].UserID;
}

