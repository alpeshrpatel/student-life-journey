import { db } from "@/shared/db";
import type { TaskDTO } from "@/shared/types";
import { buildUserContext, toTaskDTO } from "@/agents/shared/user-context";

/**
 * Smart Priority Tasks scoring (spec §3.4):
 * base priority + deadline + arrival dependency + user context (housing).
 * Fully deterministic — the LLM is never used for ranking.
 */

const BASE_WEIGHT: Record<TaskDTO["priority"], number> = {
  CRITICAL: 40,
  HIGH: 30,
  MEDIUM: 20,
  LOW: 10,
};

const PHASE_WEIGHT: Record<TaskDTO["phase"], number> = {
  BEFORE_ARRIVAL: 12,
  FIRST_24_HOURS: 18,
  FIRST_7_DAYS: 8,
  ONGOING: 2,
};

export function scoreTask(
  task: TaskDTO,
  ctx: { searching: boolean; daysUntilArrival: number },
): number {
  let score = BASE_WEIGHT[task.priority] + PHASE_WEIGHT[task.phase];
  if (ctx.searching && task.category === "HOUSING") score += 25;
  if (task.dueDate) {
    const d = Math.round(
      (new Date(task.dueDate).getTime() - Date.now()) / 86_400_000,
    );
    if (d <= 0) score += 20;
    else if (d <= 3) score += 15;
    else if (d <= 7) score += 8;
  }
  if (
    ctx.daysUntilArrival > 0 &&
    task.phase === "BEFORE_ARRIVAL"
  ) {
    score += Math.min(ctx.daysUntilArrival, 10);
  }
  return score;
}

export async function getTopPriorities(userId: string, limit = 4): Promise<TaskDTO[]> {
  const ctx = await buildUserContext(userId);
  const searching = ctx.housing.status === "SEARCHING";

  return ctx.tasks
    .filter((t) => t.status === "OPEN")
    .map((task) => ({
      task,
      score: scoreTask(task, { searching, daysUntilArrival: ctx.daysUntilArrival }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.task);
}

export async function listTasks(userId: string): Promise<TaskDTO[]> {
  const tasks = await db.task.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
  });
  return tasks.map(toTaskDTO);
}
