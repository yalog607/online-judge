import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  claimSubmission: vi.fn(),
  listTestcases: vi.fn(),
  releaseSubmission: vi.fn(),
  saveResult: vi.fn(),
}));
const sandbox = vi.hoisted(() => ({ runInSandbox: vi.fn() }));

vi.mock("@/modules/judge/repo", () => repo);
vi.mock("./sandbox", async () => {
  class InfraError extends Error {}
  return {
    InfraError,
    runInSandbox: sandbox.runInSandbox,
    prepareWorkDir: async () => undefined,
  };
});

import { judgeJob, shouldStopEarly, wallTimeoutMs } from "./processor";
import { InfraError } from "./sandbox";

const submission = {
  SubmissionID: 7,
  ProblemID: 1,
  SourceCode: "print(1)",
  Language: "python",
  TimeLimit: 1000,
  MemoryLimit: 128,
  FunctionSpec: JSON.stringify({
    name: "twoSum",
    params: [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ],
    returns: "int[]",
  }),
};
const marked = (value: string) => `debug\n\n@@ITOJ_RESULT@@\n${value}\n`;
const run = (over: Record<string, unknown> = {}) => ({
  stdout: marked("[0,1]"),
  stderr: "",
  exitCode: 0,
  timedOut: false,
  oomKilled: false,
  wallTimeMs: 5,
  cpuTimeMs: 5,
  memoryBytes: 8 * 1024 * 1024,
  ...over,
});
const job = { submissionId: 7, attempt: 1, maxAttempts: 3 };

beforeEach(() => {
  vi.resetAllMocks();
  repo.claimSubmission.mockResolvedValue(submission);
  repo.listTestcases.mockResolvedValue([
    { TestCaseID: 1, InputData: "[2,7]\n9", ExpectedOutput: "[0,1]" },
  ]);
  repo.saveResult.mockResolvedValue(undefined);
  repo.releaseSubmission.mockResolvedValue(undefined);
});

describe("judgeJob", () => {
  it("skips when the submission is already claimed", async () => {
    repo.claimSubmission.mockResolvedValue(null);
    expect(await judgeJob(job, "w1")).toEqual({ submissionId: 7, result: "skipped" });
    expect(repo.saveResult).not.toHaveBeenCalled();
  });

  it.each([
    ["AC", run()],
    ["WA", run({ stdout: marked("[1,0]") })],
    ["TLE", run({ timedOut: true })],
    ["RE", run({ exitCode: 1 })],
    ["MLE", run({ exitCode: 137, oomKilled: true })],
  ])("saves %s", async (verdict, result) => {
    sandbox.runInSandbox.mockResolvedValue(result);
    expect((await judgeJob(job, "w1")).result).toBe(verdict);
    expect(repo.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({ result: verdict, workerId: "w1" }),
    );
  });

  it("saves CE when compilation fails", async () => {
    repo.claimSubmission.mockResolvedValue({ ...submission, Language: "cpp" });
    sandbox.runInSandbox.mockResolvedValueOnce(run({ exitCode: 1 }));
    expect((await judgeJob(job, "w1")).result).toBe("CE");
  });

  it("releases the claim and rethrows infra errors so the job is retried", async () => {
    sandbox.runInSandbox.mockRejectedValue(new InfraError("no docker"));
    await expect(judgeJob(job, "w1")).rejects.toBeInstanceOf(InfraError);
    expect(repo.releaseSubmission).toHaveBeenCalledWith(7, "w1");
    expect(repo.saveResult).not.toHaveBeenCalled();
  });

  it("saves IE (not RE) on the last attempt of an infra error", async () => {
    sandbox.runInSandbox.mockRejectedValue(new InfraError("no docker"));
    const out = await judgeJob({ ...job, attempt: 3 }, "w1");
    expect(out.result).toBe("IE");
    expect(repo.saveResult).toHaveBeenCalledWith(expect.objectContaining({ result: "IE" }));
  });
});

describe("measurement", () => {
  it("stores CPU time and peak memory, not wall time", async () => {
    sandbox.runInSandbox.mockResolvedValue(run({ wallTimeMs: 900, cpuTimeMs: 60 }));
    await judgeJob(job, "w1");
    expect(repo.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({
        result: "AC",
        runtime: 40,
        memory: 8,
        results: [{ testCaseId: 1, verdict: "AC", runtime: 40, memory: 8 }],
      }),
    );
  });

  it("gives TLE by CPU time even though the container exited normally", async () => {
    sandbox.runInSandbox.mockResolvedValue(run({ cpuTimeMs: 1500 }));
    await judgeJob(job, "w1");
    expect(repo.saveResult).toHaveBeenCalledWith(expect.objectContaining({ result: "TLE" }));
  });

  it("does not charge JVM start-up against the time limit", async () => {
    repo.claimSubmission.mockResolvedValue({ ...submission, Language: "java" });
    sandbox.runInSandbox.mockResolvedValue(run({ cpuTimeMs: 1200, wallTimeMs: 1900 }));
    await judgeJob(job, "w1");
    expect(repo.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({ result: "AC", runtime: 900 }),
    );
  });

  it("kills on a wall-time safety limit above the CPU limit", async () => {
    sandbox.runInSandbox.mockResolvedValue(run());
    await judgeJob(job, "w1");
    expect(sandbox.runInSandbox).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: wallTimeoutMs(1000, 20), measure: true }),
    );
    expect(wallTimeoutMs(1000)).toBeGreaterThan(1000);
  });

  it("falls back to wall time and null memory when cgroup stats are unavailable", async () => {
    sandbox.runInSandbox.mockResolvedValue(
      run({ cpuTimeMs: null, memoryBytes: null, wallTimeMs: 50 }),
    );
    await judgeJob(job, "w1");
    expect(repo.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({ runtime: 30, memory: null }),
    );
  });
});

describe("function judging", () => {
  it("gives WA when the result marker is missing", async () => {
    sandbox.runInSandbox.mockResolvedValue(run({ stdout: "[0,1]\n" }));
    await judgeJob(job, "w1");
    expect(repo.saveResult).toHaveBeenLastCalledWith(expect.objectContaining({ result: "WA" }));
  });

  it("stores IE (not RE) without running code when the problem has no valid signature", async () => {
    repo.claimSubmission.mockResolvedValue({ ...submission, FunctionSpec: null });
    await judgeJob(job, "w1");
    expect(repo.saveResult).toHaveBeenCalledWith(expect.objectContaining({ result: "IE" }));
    expect(sandbox.runInSandbox).not.toHaveBeenCalled();
  });
});

describe("early stop", () => {
  const three = [1, 2, 3].map((id) => ({
    TestCaseID: id,
    InputData: "[2,7]\n9",
    ExpectedOutput: "[0,1]",
  }));
  const verdictsRun = () => sandbox.runInSandbox.mock.calls.length;

  beforeEach(() => repo.listTestcases.mockResolvedValue(three));

  it("runs every testcase by default", async () => {
    sandbox.runInSandbox.mockResolvedValue(run({ stdout: marked("[1,0]") }));
    await judgeJob(job, "w1");
    expect(verdictsRun()).toBe(3);
  });

  it("first-failure stops after the first failing testcase and keeps the total as denominator", async () => {
    sandbox.runInSandbox
      .mockResolvedValueOnce(run())
      .mockResolvedValueOnce(run({ stdout: marked("[1,0]") }));
    await judgeJob(job, "w1", { earlyStop: "first-failure" });
    expect(verdictsRun()).toBe(2);
    expect(repo.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({
        result: "WA",
        passedCases: "1/3",
        results: [
          expect.objectContaining({ testCaseId: 1, verdict: "AC" }),
          expect.objectContaining({ testCaseId: 2, verdict: "WA" }),
        ],
      }),
    );
  });

  it("priority mode keeps running past WA but stops on TLE, so the verdict matches a full run", async () => {
    sandbox.runInSandbox
      .mockResolvedValueOnce(run({ stdout: marked("[1,0]") }))
      .mockResolvedValueOnce(run({ timedOut: true }));
    await judgeJob(job, "w1", { earlyStop: "priority" });
    expect(verdictsRun()).toBe(2);
    expect(repo.saveResult).toHaveBeenCalledWith(expect.objectContaining({ result: "TLE" }));
  });

  it("decides per mode and verdict", () => {
    expect(shouldStopEarly("off", "TLE")).toBe(false);
    expect(shouldStopEarly("first-failure", "AC")).toBe(false);
    expect(shouldStopEarly("first-failure", "RE")).toBe(true);
    expect(shouldStopEarly("priority", "WA")).toBe(false);
    expect(shouldStopEarly("priority", "TLE")).toBe(true);
  });
});
