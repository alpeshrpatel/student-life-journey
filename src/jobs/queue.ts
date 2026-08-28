/**
 * Minimal in-process job queue (spec §18: "start simple").
 * Handlers are sequential + fire-and-forget. Swap with pg-boss/BullMQ later
 * without changing enqueue call sites.
 */

export type JobType = "REGENERATE_PLAN";

interface Job {
  id: number;
  type: JobType;
  payload: Record<string, unknown>;
}

const globalForQueue = globalThis as unknown as {
  __sljJobHandlers?: Map<JobType, (payload: Record<string, unknown>) => Promise<void>>;
  __sljJobs?: Job[];
  __sljDraining?: boolean;
};

const jobHandlers =
  globalForQueue.__sljJobHandlers ??
  (globalForQueue.__sljJobHandlers = new Map());
const queue = globalForQueue.__sljJobs ?? (globalForQueue.__sljJobs = []);

export function registerJobHandler(
  type: JobType,
  fn: (payload: Record<string, unknown>) => Promise<void>,
): void {
  jobHandlers.set(type, fn);
}

let jobId = 0;

export function enqueue(type: JobType, payload: Record<string, unknown>): void {
  queue.push({ id: ++jobId, type, payload });
  void drain();
}

async function drain(): Promise<void> {
  if (globalForQueue.__sljDraining) return;
  globalForQueue.__sljDraining = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift()!;
      const handler = jobHandlers.get(job.type);
      if (!handler) {
        console.error(`[jobs] no handler for ${job.type}`);
        continue;
      }
      try {
        await handler(job.payload);
      } catch (err) {
        console.error(`[jobs] job ${job.type} #${job.id} failed:`, err);
      }
    }
  } finally {
    globalForQueue.__sljDraining = false;
  }
}
