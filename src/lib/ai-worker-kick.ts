import { runWorkflowWorker } from "@/lib/ai-workflow";

const MAX_CHAIN_DEPTH = 40;

/**
 * Fire-and-forget: kick the background AI worker after enqueueing tasks.
 * Chains additional ticks while work remains queued (serverless step-at-a-time pipeline).
 */
export function kickAiWorker(maxRuns = 3, depth = 0) {
  const capped = Math.max(1, Math.min(maxRuns, 5));
  void runWorkflowWorker({ maxRuns: capped })
    .then((result) => {
      const shouldChain =
        depth < MAX_CHAIN_DEPTH
        && result.queuedRemaining > 0
        && (result.claimed > 0 || result.results.some((item) => item.partial));

      if (shouldChain) {
        kickAiWorker(Math.min(result.queuedRemaining, 3), depth + 1);
      }
    })
    .catch((error) => {
      console.warn("[ai-worker-kick] worker tick failed:", error);
    });
}
