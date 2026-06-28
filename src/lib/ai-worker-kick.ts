import { runWorkflowWorker } from "@/lib/ai-workflow";

/**
 * Fire-and-forget: kick the background AI worker after enqueueing tasks.
 * Does not block the HTTP response; errors are logged only.
 */
export function kickAiWorker(maxRuns = 3) {
  const capped = Math.max(1, Math.min(maxRuns, 5));
  void runWorkflowWorker({ maxRuns: capped }).catch((error) => {
    console.warn("[ai-worker-kick] worker tick failed:", error);
  });
}
