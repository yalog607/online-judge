import { spawn, execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";

const OUTPUT_CAP = 64 * 1024;
// Largest single file the sandboxed process may write (RLIMIT_FSIZE) and open descriptors.
const FILE_SIZE_LIMIT_BYTES = 32 * 1024 * 1024;
const OPEN_FILES_LIMIT = 256;

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

// UID/GID of the unprivileged `sandbox` user baked into every judge image.
const SANDBOX_UID = 10001;

// Gives the sandbox user access to the judging directory without making it world-writable.
// Returns the `user` override for runInSandbox when the worker is not allowed to chown
// (non-root dev setups): the container then runs as the worker's own uid instead.
export async function prepareWorkDir(dir: string): Promise<string | undefined> {
  try {
    await fs.chown(dir, SANDBOX_UID, SANDBOX_UID);
    await fs.chmod(dir, 0o750);
    return undefined;
  } catch {
    await fs.chmod(dir, 0o700);
    return `${process.getuid?.() ?? SANDBOX_UID}:${process.getgid?.() ?? SANDBOX_UID}`;
  }
}

export type SandboxOptions = {
  image: string;
  hostDir: string;
  cmd: string[];
  stdin: string;
  timeoutMs: number;
  memoryMb: number;
  // Only the compile step writes into /sandbox; test runs mount it read-only so a
  // submission cannot fill the host disk through the bind mount.
  writable?: boolean;
  // Overrides the image user ("uid:gid"); used when the worker cannot chown the directory.
  user?: string;
};

export function buildDockerArgs(name: string, opts: SandboxOptions): string[] {
  return [
    "run",
    "--rm",
    "--name",
    name,
    "--network",
    "none",
    "-i",
    "-v",
    `${opts.hostDir}:/sandbox${opts.writable ? "" : ":ro"}`,
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
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--ulimit",
    `fsize=${FILE_SIZE_LIMIT_BYTES}:${FILE_SIZE_LIMIT_BYTES}`,
    "--ulimit",
    `nofile=${OPEN_FILES_LIMIT}:${OPEN_FILES_LIMIT}`,
    "--ulimit",
    "core=0:0",
    "--read-only",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=16m",
    ...(opts.user ? ["--user", opts.user, "-e", "HOME=/tmp"] : []),
    opts.image,
    ...opts.cmd,
  ];
}

export function runInSandbox(opts: SandboxOptions): Promise<RunResult> {
  const name = `itoj-run-${randomBytes(6).toString("hex")}`;
  const args = buildDockerArgs(name, opts);

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
