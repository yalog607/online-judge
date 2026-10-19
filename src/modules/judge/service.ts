import { enqueueJudge } from "./queue";
import { requestProblemRejudge } from "./repo";

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

// Re-judges each user's latest submission after a problem's testcases changed. Failures are
// logged only: the submissions stay `Pending` and the worker's sweeper enqueues them later.
export async function rejudgeProblemSubmissions(problemId: number): Promise<number> {
  try {
    const ids = await requestProblemRejudge(problemId);
    for (const id of ids) await dispatchSubmission(id);
    return ids.length;
  } catch (e) {
    console.error(`rejudge after testcase change failed for problem ${problemId}`, e);
    return 0;
  }
}
