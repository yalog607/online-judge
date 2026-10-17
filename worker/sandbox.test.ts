import { describe, expect, it } from "vitest";
import { buildDockerArgs, parseStats } from "./sandbox";

const base = {
  image: "itoj-judge-python:latest",
  hostDir: "/tmp/itoj-1",
  cmd: ["python3", "main.py"],
  stdin: "",
  timeoutMs: 1000,
  memoryMb: 128,
};
const pairs = (args: string[], flag: string) =>
  args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));

describe("buildDockerArgs", () => {
  it("applies the hardening flags and keeps the isolation limits", () => {
    const args = buildDockerArgs("n", base);
    expect(pairs(args, "--cap-drop")).toEqual(["ALL"]);
    expect(pairs(args, "--security-opt")).toEqual(["no-new-privileges"]);
    expect(pairs(args, "--network")).toEqual(["none"]);
    expect(pairs(args, "--memory")).toEqual(["128m"]);
    expect(pairs(args, "--pids-limit")).toEqual(["64"]);
    expect(args).toContain("--read-only");
    expect(pairs(args, "--ulimit").some((u) => u.startsWith("fsize="))).toBe(true);
    expect(pairs(args, "--ulimit").some((u) => u.startsWith("nofile="))).toBe(true);
    expect(args.slice(-3)).toEqual(["itoj-judge-python:latest", "python3", "main.py"]);
  });

  it("mounts /sandbox read-only unless the step must write (compile)", () => {
    expect(pairs(buildDockerArgs("n", base), "-v")).toEqual(["/tmp/itoj-1:/sandbox:ro"]);
    expect(pairs(buildDockerArgs("n", { ...base, writable: true }), "-v")).toEqual([
      "/tmp/itoj-1:/sandbox",
    ]);
  });

  it("runs as the given user when the directory could not be chowned", () => {
    const args = buildDockerArgs("n", { ...base, user: "1000:1000" });
    expect(pairs(args, "--user")).toEqual(["1000:1000"]);
    expect(buildDockerArgs("n", base)).not.toContain("--user");
  });
});

describe("parseStats", () => {
  it("reads the cgroup figures and converts µs to ms", () => {
    expect(parseStats("oops\n@@ITOJ_STATS@@ 123456 4194304 0\n")).toEqual({
      cpuTimeMs: 123,
      memoryBytes: 4194304,
      oomKills: 0,
    });
  });

  it("uses the last marker so a submission cannot forge its own figures", () => {
    const forged = "@@ITOJ_STATS@@ 0 0 0\n@@ITOJ_STATS@@ 9000000 1048576 1\n";
    expect(parseStats(forged)).toEqual({ cpuTimeMs: 9000, memoryBytes: 1048576, oomKills: 1 });
  });

  it("maps -1 to null and returns null without a marker", () => {
    expect(parseStats("@@ITOJ_STATS@@ -1 -1 0\n")).toEqual({
      cpuTimeMs: null,
      memoryBytes: null,
      oomKills: 0,
    });
    expect(parseStats("no stats")).toBeNull();
  });
});

describe("measure wrapper", () => {
  it("wraps the command in sh -c only when measuring", () => {
    const wrapped = buildDockerArgs("n", { ...base, measure: true });
    const i = wrapped.indexOf("itoj-judge-python:latest");
    expect(wrapped.slice(i + 1, i + 3)).toEqual(["sh", "-c"]);
    expect(wrapped.slice(-3)).toEqual(["itoj", "python3", "main.py"]);
    expect(buildDockerArgs("n", base).slice(-2)).toEqual(["python3", "main.py"]);
  });
});
