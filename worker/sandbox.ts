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
  // Whole `docker run` duration, container start-up included; never use it for TLE.
  wallTimeMs: number;
  // CPU time / peak memory of the container's cgroup; null when the host exposes neither.
  cpuTimeMs: number | null;
  memoryBytes: number | null;
};

const TAIL_CAP = 1024;

// Keeps the first OUTPUT_CAP bytes plus the last TAIL_CAP bytes, so the trailing stats line
// written by the measuring wrapper survives even when a submission floods stderr.
function capture(stream: NodeJS.ReadableStream): { get: () => string; tail: () => string } {
  const chunks: Buffer[] = [];
  let size = 0;
  let tail = Buffer.alloc(0);
  stream.on("data", (chunk: Buffer) => {
    tail = Buffer.concat([tail, chunk]).subarray(-TAIL_CAP);
    if (size >= OUTPUT_CAP) return;
    chunks.push(chunk);
    size += chunk.length;
  });
  return {
    get: () => Buffer.concat(chunks).subarray(0, OUTPUT_CAP).toString("utf8"),
    tail: () => tail.toString("utf8"),
  };
}

export const STATS_MARKER = "@@ITOJ_STATS@@";

// Runs the command, then prints "<marker> <cpu_us> <peak_bytes> <oom_kills>" to stderr from
// the container's own cgroup (v2, with a v1 fallback). -1 means the value is unavailable.
// Measuring inside the container excludes `docker run` start-up from the CPU time.
const MEASURE_SCRIPT = `"$@"
c=$?
g=/sys/fs/cgroup
cpu=-1; mem=-1; oom=0
if [ -r $g/cpu.stat ]; then
  while read -r k v; do [ "$k" = usage_usec ] && cpu=$v; done < $g/cpu.stat
  [ -r $g/memory.peak ] && read -r mem < $g/memory.peak
  [ -r $g/memory.events ] && while read -r k v; do [ "$k" = oom_kill ] && oom=$v; done < $g/memory.events
elif [ -r $g/cpuacct/cpuacct.usage ]; then
  read -r ns < $g/cpuacct/cpuacct.usage && cpu=$((ns / 1000))
  [ -r $g/memory/memory.max_usage_in_bytes ] && read -r mem < $g/memory/memory.max_usage_in_bytes
  [ -r $g/memory/memory.oom_control ] && while read -r k v; do [ "$k" = oom_kill ] && oom=$v; done < $g/memory/memory.oom_control
fi
printf '\n${STATS_MARKER} %s %s %s\n' "$cpu" "$mem" "$oom" >&2
exit $c`;

export type SandboxStats = { cpuTimeMs: number | null; memoryBytes: number | null; oomKills: number };

// Takes the LAST marker so output printed by the submission cannot override the real figures.
export function parseStats(stderr: string): SandboxStats | null {
  const at = stderr.lastIndexOf(STATS_MARKER);
  if (at < 0) return null;
  const m = /^ (-?\d+) (-?\d+) (\d+)/.exec(stderr.slice(at + STATS_MARKER.length));
  if (!m) return null;
  const cpu = Number(m[1]);
  const mem = Number(m[2]);
  return {
    cpuTimeMs: cpu >= 0 ? Math.round(cpu / 1000) : null,
    memoryBytes: mem >= 0 ? mem : null,
    oomKills: Number(m[3]),
  };
}

function stripStats(stderr: string): string {
  const at = stderr.lastIndexOf(STATS_MARKER);
  return at < 0 ? stderr : stderr.slice(0, at).replace(/\n$/, "");
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
  // Wraps `cmd` so CPU time and peak memory are read from the cgroup (test runs only).
  measure?: boolean;
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
    ...(opts.measure ? ["sh", "-c", MEASURE_SCRIPT, "itoj", ...opts.cmd] : opts.cmd),
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
      const stats = opts.measure ? parseStats(stderr.tail()) : null;
      const err = opts.measure ? stripStats(stderr.get()) : stderr.get();
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
        oomKilled: (stats?.oomKills ?? 0) > 0 || (code === 137 && !timedOut),
        wallTimeMs: Date.now() - start,
        cpuTimeMs: stats?.cpuTimeMs ?? null,
        memoryBytes: stats?.memoryBytes ?? null,
      });
    });

    child.on("error", (e) => {
      clearTimeout(timer);
      reject(new InfraError(`docker unavailable: ${e.message}`));
    });
  });
}
