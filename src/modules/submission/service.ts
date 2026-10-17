import "server-only";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSubmission } from "./repo";
import { SUBMIT_RATE_MESSAGE, submitRules } from "./limits";

// The cap on Pending/Judging submissions per user is enforced in app.usp_Submission_Create.
export async function submitCode(input: Parameters<typeof createSubmission>[0]) {
  await enforceRateLimit(submitRules(input.userId), SUBMIT_RATE_MESSAGE);
  return createSubmission(input);
}
