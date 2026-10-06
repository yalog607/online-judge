import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/lib/env";
import {
  JUDGE_QUEUE,
  judgeJobId,
  judgeJobSchema,
  type JudgeJobData,
  type JudgeJobResult,
} from "./schema";

export const JUDGE_JOB_ATTEMPTS = 3;

type Shared = { connection?: IORedis; queue?: Queue; events?: QueueEvents };
const g = globalThis as typeof globalThis & { __itojJudgeQueue?: Shared };
const shared: Shared = (g.__itojJudgeQueue ??= {});

export function createRedisConnection() {
  return new IORedis(env().REDIS_URL, { maxRetriesPerRequest: null });
}

function connection() {
  return (shared.connection ??= createRedisConnection());
}

export function judgeQueue() {
  return (shared.queue ??= new Queue<JudgeJobData, JudgeJobResult>(JUDGE_QUEUE, {
    connection: connection(),
    defaultJobOptions: {
      attempts: JUDGE_JOB_ATTEMPTS,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 24 * 3600, count: 1000 },
    },
  }));
}

export function judgeQueueEvents() {
  return (shared.events ??= new QueueEvents(JUDGE_QUEUE, { connection: createRedisConnection() }));
}

// jobId = submissionId, so enqueueing the same submission twice is a no-op while its job exists.
export async function enqueueJudge(submissionId: number) {
  const data = judgeJobSchema.parse({ submissionId });
  const queue = judgeQueue();
  const jobId = judgeJobId(data.submissionId);

  // A finished job would make `add` ignore a legitimate re-enqueue (e.g. after requeueStale).
  const existing = await queue.getJob(jobId);
  if (existing && ((await existing.isCompleted()) || (await existing.isFailed()))) {
    await existing.remove();
  }
  await queue.add("judge", data, { jobId });
}
