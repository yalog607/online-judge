import { spawn, execFile } from "node:child_process";
import { randomBytes } from "node:crypto";

const OUTPUT_CAP = 64 * 1024;

// Docker itself failed (missing binary/daemon/image/mount) - never the submission's fault.
export class InfraError extends Error {}

export type RunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  oomKilled: boolean;
  wallTimeMs: number;
};

function capture(stream: NodeJS.ReadableStream): { get: () => string } {
  const chunks: Buffer[] = [];
  let size = 0;
  stream.on("data", (chunk: Buffer) => {
    if (size >= OUTPUT_CAP) return;
    chunks.push(chunk);
    size += chunk.length;
  });
  return { get: () => Buffer.concat(chunks).subarray(0, OUTPUT_CAP).toString("utf8") };
}

export function runInSandbox(opts: {
  image: string;
  hostDir: string;
  cmd: string[];
  stdin: string;
  timeoutMs: number;
  memoryMb: number;
}): Promise<RunResult> {
  const name = `itoj-run-${randomBytes(6).toString("hex")}`;
  const args = [
    "run",
    "--rm",
    "--name",
    name,
    "--network",
    "none",
    "-i",
    "-v",
    `${opts.hostDir}:/sandbox`,
    "-w",
    "/sandbox",
    "--memory",
    `${opts.memoryMb}m`,
    "--memory-swap",
    `${opts.memoryMb}m`,
    "--cpus",
    "1",
    "--pids-limit",
    "64",
    "--read-only",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=16m",
    opts.image,
    ...opts.cmd,
  ];

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    const stdout = capture(child.stdout);
    const stderr = capture(child.stderr);
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      execFile("docker", ["kill", name], () => {});
    }, opts.timeoutMs);

    child.stdin.on("error", () => {});
    child.stdin.write(opts.stdin);
    child.stdin.end();

    child.on("close", (code) => {
      clearTimeout(timer);
      const err = stderr.get();
      // `docker run` exits 125 with a "docker: ..." message when the daemon/image/mount fails.
      if (code === 125 && /^docker:/m.test(err)) {
        reject(new InfraError(err.trim().slice(0, 500)));
        return;
      }
      resolve({
        stdout: stdout.get(),
        stderr: err,
        exitCode: code,
        timedOut,
        oomKilled: code === 137 && !timedOut,
        wallTimeMs: Date.now() - start,
      });
    });

    child.on("error", (e) => {
      clearTimeout(timer);
      reject(new InfraError(`docker unavailable: ${e.message}`));
    });
  });
}
