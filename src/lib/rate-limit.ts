import IORedis from "ioredis";
import { DomainError } from "@/db/exec";
import { env } from "@/lib/env";

// Not a SQL Server error number (those start at 50000); marks an application-level throttle.
export const RATE_LIMIT_CODE = 42900;

type Shared = { redis?: IORedis };
const g = globalThis as typeof globalThis & { __itojRateLimit?: Shared };
const shared: Shared = (g.__itojRateLimit ??= {});

// Fail fast instead of queueing commands while Redis is down: limiting must never stall a request.
function redis() {
  return (shared.redis ??= new IORedis(env().REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 2000,
    lazyConnect: false,
  }).on("error", () => {}));
}

export type RateLimitRule = {
  /** Namespace, e.g. "login:ip". */
  scope: string;
  /** Subject being limited (user id, IP, email). */
  key: string | number;
  limit: number;
  windowSeconds: number;
};

/** Fixed-window counter. Returns true when the call is allowed; fails open (with a log) if Redis errors. */
export async function consume(rule: RateLimitRule): Promise<boolean> {
  const key = `rl:${rule.scope}:${rule.key}`;
  try {
    const count = await redis().incr(key);
    if (count === 1) await redis().expire(key, rule.windowSeconds);
    return count <= rule.limit;
  } catch (e) {
    console.error(`rate limit unavailable for ${rule.scope}, allowing request`, e);
    return true;
  }
}

/** Throws a DomainError with `message` when any rule is exceeded. */
export async function enforceRateLimit(rules: RateLimitRule[], message: string): Promise<void> {
  for (const rule of rules) {
    if (!(await consume(rule))) throw new DomainError(RATE_LIMIT_CODE, message);
  }
}
