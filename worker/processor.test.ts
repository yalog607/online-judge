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
  return { InfraError, runInSandbox: sandbox.runInSandbox };
});

import { judgeJob } from "./processor";
import { InfraError } from "./sandbox";

const submission = {
  SubmissionID: 7,
  ProblemID: 1,
  SourceCode: "print(1)",
  Language: "python",
  TimeLimit: 1000,
  MemoryLimit: 128,
};
const run = (over: Record<string, unknown> = {}) => ({
  stdout: "1\n",
  stderr: "",
  exitCode: 0,
  timedOut: false,
  oomKilled: false,
  wallTimeMs: 5,
  ...over,
});
const job = { submissionId: 7, attempt: 1, maxAttempts: 3 };

beforeEach(() => {
  vi.resetAllMocks();
  repo.claimSubmission.mockResolvedValue(submission);
  repo.listTestcases.mockResolvedValue([{ TestCaseID: 1, InputData: "", ExpectedOutput: "1" }]);
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
    ["WA", run({ stdout: "2\n" })],
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
