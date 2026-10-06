import "dotenv/config";
import os from "node:os";
import { Worker } from "bullmq";
import { env } from "@/lib/env";
import { heartbeat, requeueStale } from "@/modules/judge/repo";
import { createRedisConnection, enqueueJudge, JUDGE_JOB_ATTEMPTS } from "@/modules/judge/queue";
import {
  JUDGE_QUEUE,
  judgeJobSchema,
  type JudgeJobData,
  type JudgeJobResult,
} from "@/modules/judge/schema";
import { judgeJob } from "./processor";

const WORKER_ID = `${os.hostname()}-${process.pid}`;
const HEARTBEAT_MS = 10000;
const SWEEP_MS = 60000;
// A submission claimed longer ago than this is assumed to belong to a dead worker.
const STALE_SECONDS = 900;

// Safety net, not the delivery path: re-enqueues submissions whose job was lost
// (Redis restart, failed enqueue, crashed worker).
async function sweep() {
  const ids = await requeueStale(STALE_SECONDS);
  for (const id of ids) await enqueueJudge(id);
  if (ids.length) console.log(`sweeper re-enqueued ${ids.length} submission(s)`);
}

async function main() {
  console.log(`itoj-worker ${WORKER_ID} started`);

  const worker = new Worker<JudgeJobData, JudgeJobResult>(
    JUDGE_QUEUE,
    async (job) => {
      const { submissionId } = judgeJobSchema.parse(job.data);
      console.log(`judging submission ${submissionId} (attempt ${job.attemptsMade + 1})`);
      return judgeJob(
        {
          submissionId,
          attempt: job.attemptsMade + 1,
          maxAttempts: job.opts.attempts ?? JUDGE_JOB_ATTEMPTS,
        },
        WORKER_ID,
      );
    },
    { connection: createRedisConnection(), concurrency: env().JUDGE_CONCURRENCY },
  );
  worker.on("failed", (job, err) => console.error(`job ${job?.id} failed: ${err.message}`));
  worker.on("error", (err) => console.error("worker error", err));

  const timers = [
    setInterval(() => {
      heartbeat(WORKER_ID).catch((e) => console.error("heartbeat failed", e));
    }, HEARTBEAT_MS),
    setInterval(() => {
      sweep().catch((e) => console.error("sweep failed", e));
    }, SWEEP_MS),
  ];
  sweep().catch((e) => console.error("sweep failed", e));

  const shutdown = async () => {
    timers.forEach(clearInterval);
    await worker.close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main();
