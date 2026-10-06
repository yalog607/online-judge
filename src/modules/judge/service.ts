import { enqueueJudge } from "./queue";

// Hands a freshly created submission to the judge queue. If Redis is unavailable the
// submission stays `Pending` and the worker's sweeper enqueues it later, so a queue
// failure is logged but never fails the submission itself.
export async function dispatchSubmission(submissionId: number): Promise<boolean> {
  try {
    await enqueueJudge(submissionId);
    return true;
  } catch (e) {
    console.error(`enqueue judge failed for submission ${submissionId}`, e);
    return false;
  }
}
