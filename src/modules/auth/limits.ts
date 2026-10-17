import type { RateLimitRule } from "@/lib/rate-limit";

export const LOGIN_RATE_MESSAGE = "Bạn đăng nhập sai quá nhiều lần, vui lòng thử lại sau ít phút.";
export const OTP_RATE_MESSAGE = "Bạn yêu cầu mã OTP quá nhiều lần, vui lòng thử lại sau ít phút.";

export const loginRules = (ip: string, email: string): RateLimitRule[] => [
  { scope: "login:ip", key: ip, limit: 30, windowSeconds: 15 * 60 },
  { scope: "login:email", key: email, limit: 10, windowSeconds: 15 * 60 },
];

export const otpRules = (ip: string, email: string): RateLimitRule[] => [
  { scope: "otp:ip", key: ip, limit: 10, windowSeconds: 10 * 60 },
  { scope: "otp:email", key: email, limit: 3, windowSeconds: 10 * 60 },
];
