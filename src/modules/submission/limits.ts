import type { RateLimitRule } from "@/lib/rate-limit";

/** Max source size, measured in UTF-8 bytes. Mirrored (in characters) by app.usp_Submission_Create. */
export const MAX_SOURCE_BYTES = 64 * 1024;

export const SUBMIT_PER_MINUTE = 6;

export const submitRules = (userId: number): RateLimitRule[] => [
  { scope: "submit:user", key: userId, limit: SUBMIT_PER_MINUTE, windowSeconds: 60 },
];

export const SUBMIT_RATE_MESSAGE = "Bạn nộp bài quá nhanh, vui lòng thử lại sau ít phút.";
