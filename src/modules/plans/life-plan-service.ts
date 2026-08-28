import { z } from "zod";
import { db } from "@/shared/db";
import { ApiError } from "@/shared/http";
import type { LifePlanDTO } from "@/shared/types";
import type {
  RelocationPlanSchema,
} from "@/ai/schemas/relocation-plan";
import { relocationAgent } from "@/agents/relocation-agent/relocation-agent";
import { buildUserContext } from "@/agents/shared/user-context";
import { syncTasksFromPlan } from "@/modules/tasks/task-service";
import { isOnboarded } from "@/modules/relocation/onboarding-service";
import { emitDomainEvent } from "@/jobs/events";

type PlanPriorities = z.infer<typeof RelocationPlanSchema>["priorities"];

function toDTO(plan: {
  id: string;
  summary: string;
  priorities: unknown;
  first24Hours: unknown;
  first7Days: unknown;
  ongoing: unknown;
  generatedBy: string;
  version: number;
  updatedAt: Date;
}): LifePlanDTO {
  return {
    id: plan.id,
    summary: plan.summary,
    priorities: (plan.priorities ?? []) as PlanPriorities,
    first24Hours: Array.isArray(plan.first24Hours) ? (plan.first24Hours as string[]) : [],
    first7Days: Array.isArray(plan.first7Days)
      ? (plan.first7Days as { day: number; tasks: string[] }[])
      : [],
    ongoing: Array.isArray(plan.ongoing) ? (plan.ongoing as string[]) : [],
    generatedBy: plan.generatedBy,
    version: plan.version,
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export async function getLatestPlan(userId: string): Promise<LifePlanDTO | null> {
  const plan = await db.lifePlan.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return plan ? toDTO(plan) : null;
}

/**
 * Generates a fresh personalized plan via the Relocation Agent, persists it
 * as a new version, syncs tasks, and emits RelocationPlanGenerated.
 */
export async function generatePlan(
  userId: string,
  reason = "manual",
): Promise<LifePlanDTO> {
  if (!(await isOnboarded(userId))) {
    throw new ApiError("Complete onboarding before generating a plan", 409);
  }

  const ctx = await buildUserContext(userId);
  const { plan, generatedBy } = await relocationAgent.generatePlan(ctx);

  const previous = await db.lifePlan.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { version: true },
  });

  const saved = await db.lifePlan.create({
    data: {
      userId,
      summary: plan.summary,
      priorities: plan.priorities,
      first24Hours: plan.first24Hours,
      first7Days: plan.first7Days,
      ongoing: plan.ongoing,
      generatedBy,
      reason,
      version: (previous?.version ?? 0) + 1,
    },
  });

  await syncTasksFromPlan(userId, plan.tasks);

  emitDomainEvent({
    type: "RelocationPlanGenerated",
    userId,
    planId: saved.id,
  });

  return toDTO(saved);
}
