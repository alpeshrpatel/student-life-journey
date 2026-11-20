import { z } from "zod";
import { db } from "@/shared/db";
import { ApiError } from "@/shared/http";
import type { DashboardData, TaskDTO } from "@/shared/types";
import { toTaskDTO, buildUserContext } from "@/agents/shared/user-context";
import { emitDomainEvent } from "@/jobs/events";
import { getTopPriorities } from "./priority";

/** Task lifecycle + dashboard assembly (spec §3.4, MVP screens). */

export const CreateTaskSchema = z.object({
  title: z.string().min(2).max(140),
  description: z.string().max(500).optional(),
  reason: z.string().max(300).optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  phase: z
    .enum(["BEFORE_ARRIVAL", "FIRST_24_HOURS", "FIRST_7_DAYS", "ONGOING"])
    .default("BEFORE_ARRIVAL"),
  estimateMinutes: z.number().int().positive().max(600).optional(),
});

export async function addManualTask(
  userId: string,
  input: z.infer<typeof CreateTaskSchema>,
): Promise<TaskDTO> {
  const task = await db.task.create({
    data: { ...input, userId, source: "USER" },
  });
  return toTaskDTO(task);
}

export async function completeTask(userId: string, taskId: string): Promise<void> {
  const result = await db.task.updateMany({
    where: { id: taskId, userId },
    data: { status: "DONE", completedAt: new Date() },
  });
  if (result.count === 0) throw new ApiError("Task not found", 404);
  emitDomainEvent({ type: "TaskCompleted", userId, taskId });
}

export async function reopenTask(userId: string, taskId: string): Promise<TaskDTO> {
  const existing = await db.task.findFirst({ where: { id: taskId, userId } });
  if (!existing) throw new ApiError("Task not found", 404);
  const task = await db.task.update({
    where: { id: taskId },
    data: { status: "OPEN", completedAt: null },
  });
  return toTaskDTO(task);
}

/** Seeds Task rows from an AI-generated plan without duplicating titles. */
export async function syncTasksFromPlan(
  userId: string,
  planTasks: {
    title: string;
    priority: TaskDTO["priority"];
    phase: TaskDTO["phase"];
    reason?: string;
    category?: string;
    estimateMinutes?: number;
  }[],
): Promise<number> {
  const existing = await db.task.findMany({
    where: { userId },
    select: { title: true },
  });
  const seen = new Set(existing.map((t) => t.title.toLowerCase().trim()));

  const toCreate = planTasks
    .filter((t) => !seen.has(t.title.toLowerCase().trim()))
    .slice(0, 12)
    .map((t) => ({
      userId,
      title: t.title,
      reason: t.reason || null,
      priority: t.priority,
      phase: t.phase,
      category: t.category ?? null,
      estimateMinutes: t.estimateMinutes ?? null,
      source: "PLAN" as const,
    }));

  if (toCreate.length === 0) return 0;
  return (await db.task.createMany({ data: toCreate })).count;
}
