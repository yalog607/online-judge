import { describe, expect, it } from "vitest";
import { buildDockerArgs } from "./sandbox";

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
