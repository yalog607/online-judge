import { afterEach, describe, expect, it, vi } from "vitest";

const REQUIRED = {
  DB_HOST: "localhost",
  DB_NAME: "itoj",
  DB_APP_USER: "itoj_app",
  DB_APP_PASSWORD: "pw",
  SESSION_SECRET: "a".repeat(32),
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  MAIL_FROM: "ITOJ <no-reply@itoj.local>",
};

async function loadEnv(overrides: Record<string, string | undefined> = {}) {
  vi.resetModules();
  const previous = { ...process.env };
  Object.assign(process.env, REQUIRED, overrides);
  const mod = await import("./env");
  const result = mod.env();
  process.env = previous;
  return result;
}

describe("env()", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses required vars and defaults DB_PORT", async () => {
    const e = await loadEnv();
    expect(e.DB_PORT).toBe(1433);
    expect(e.DB_NAME).toBe("itoj");
  });

  it("throws when SESSION_SECRET is too short", async () => {
    await expect(loadEnv({ SESSION_SECRET: "short" })).rejects.toBeTruthy();
  });
});

describe("env() queue settings", () => {
  it("defaults REDIS_URL and JUDGE_CONCURRENCY", async () => {
    const e = await loadEnv();
    expect(e.REDIS_URL).toBe("redis://localhost:6379");
    expect(e.JUDGE_CONCURRENCY).toBe(1);
  });
});
