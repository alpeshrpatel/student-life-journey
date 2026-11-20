import type { DashboardData } from "@/shared/types";
import { db } from "@/shared/db";
import { buildUserContext } from "@/agents/shared/user-context";
import { getTopPriorities } from "./priority";

/** Dashboard = urgency + next action (spec §4: "What should I do next?"). */
export async function getDashboard(userId: string): Promise<DashboardData> {
  const ctx = await buildUserContext(userId);

  const [topPriorities, plan, openCount, doneCount] = await Promise.all([
    getTopPriorities(userId, 4),
    db.lifePlan.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    db.task.count({ where: { userId, status: "OPEN" } }),
    db.task.count({ where: { userId, status: "DONE" } }),
  ]);

  const searching = ctx.housing.status === "SEARCHING";

  let nextAction: DashboardData["nextAction"];
  if (!plan) {
    nextAction = {
      kind: "PLAN_REGENERATE",
      title: "Generate your relocation plan",
      description: "Create your personalized BEFORE ARRIVAL → ONGOING plan.",
      href: "/plan",
    };
  } else if (topPriorities.length > 0) {
    nextAction = {
      kind: "TASK",
      title: topPriorities[0].title,
      description:
        topPriorities[0].estimateMinutes != null
          ? `~${topPriorities[0].estimateMinutes} minutes — ${topPriorities[0].reason ?? "your top priority"}`
          : (topPriorities[0].reason ?? "Your top priority right now"),
      href: "/tasks",
    };
  } else if (searching) {
    nextAction = {
      kind: "HOUSING_REVIEW",
      title: "Review housing options",
      description: "Compare real monthly cost and move-in cash before committing.",
      href: "/housing",
    };
  } else {
    nextAction = {
      kind: "ONBOARD_PLACES",
      title: "Explore essential places nearby",
      description: "Find groceries, pharmacies and transit around your new home.",
      href: "/places",
    };
  }

  return {
    greetingName: (ctx.name ?? "").split(/\s+/)[0] ?? "",
    daysUntilArrival: ctx.daysUntilArrival,
    arrived: ctx.daysUntilArrival <= 0,
    origin: ctx.relocation.origin,
    destination: ctx.relocation.destination,
    housingStatus: ctx.housing.status,
    topPriorities,
    nextAction,
    stats: {
      openTasks: openCount,
      doneTasks: doneCount,
      planVersion: plan?.version ?? null,
      planGeneratedAt: plan?.updatedAt.toISOString() ?? null,
    },
  };
}
