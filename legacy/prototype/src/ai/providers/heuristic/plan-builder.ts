import type { UserContext } from "@/shared/types";
import { formatMoney } from "@/shared/utils";
import type {
  ExtendedRelocationPlan,
  GeneratedTask,
} from "@/ai/schemas/relocation-plan";

/**
 * Deterministic relocation plan builder used by HeuristicProvider.
 * Produces the same structured contract the LLM would, strictly from
 * verified user context (spec §13 pipeline: validate → business rules → DB).
 */

type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface PlanPriority {
  title: string;
  priority: Priority;
  reason: string;
}

export function buildPrioritiesAndTasks(ctx: UserContext): {
  priorities: PlanPriority[];
  tasks: GeneratedTask[];
} {
  const dest = ctx.relocation.destination;
  const days = ctx.daysUntilArrival;
  const searching = ctx.housing.status === "SEARCHING";
  const soon = days <= 21;
  const budget = ctx.finances.monthlyBudget;
  const transitPref = (ctx.transportation.preferences ?? [])[0] ?? "PUBLIC_TRANSIT";

  const priorities: PlanPriority[] = [];

  if (searching) {
    priorities.push({
      title: "Find housing",
      priority: "CRITICAL",
      reason:
        days >= 0
          ? `You arrive in ${dest} in ${days} day${days === 1 ? "" : "s"} without secured housing — this blocks everything else.`
          : `You are already in ${dest} without secured housing — make this today's focus.`,
    });
  } else {
    priorities.push({
      title: "Confirm move-in details & keys",
      priority: "HIGH",
      reason:
        "Avoid arrival-day surprises by confirming entry instructions, keys and what's included.",
    });
  }

  priorities.push({
    title: "Arrange airport transportation",
    priority: soon ? "HIGH" : "MEDIUM",
    reason: soon
      ? `Arrival is close (${Math.max(days, 0)} day(s)) — lock your ride from the airport now.`
      : "Deciding early usually means cheaper and less stressful arrival.",
  });

  priorities.push({
    title: "Prepare phone connectivity",
    priority: days <= 14 ? "HIGH" : "MEDIUM",
    reason:
      "Maps, ride apps and contacts all depend on data on day one. Research eSIM/SIM options for " +
      dest +
      ".",
  });

  if (budget) {
    priorities.push({
      title: "Estimate total move-in costs",
      priority: searching ? "HIGH" : "MEDIUM",
      reason: `With a ${formatMoney(budget)} monthly budget you should know the full cash needed before signing anything.`,
    });
  }

  priorities.push({
    title: "Save important addresses offline",
    priority: "MEDIUM",
    reason: "Home address, work/school address and emergency contacts should survive a dead battery.",
  });

  priorities.push({
    title: "Create first grocery plan",
    priority: "MEDIUM",
    reason: "A simple 5-meal starter plan prevents expensive takeout during your first days.",
  });

  if (transitPref === "PUBLIC_TRANSIT") {
    priorities.push({
      title: `Learn how transit works in ${dest}`,
      priority: "MEDIUM",
      reason: "Find out which card/app covers metro & buses and roughly what a monthly pass costs.",
    });
  }

  const topPriorities = priorities.slice(0, 6);

  const tasks: GeneratedTask[] = topPriorities.map((p, i) => ({
    title: p.title,
    priority: p.priority,
    phase:
      p.title === "Create first grocery plan"
        ? "FIRST_7_DAYS"
        : p.title.startsWith("Learn how transit")
          ? "FIRST_7_DAYS"
          : ("BEFORE_ARRIVAL" as GeneratedTask["phase"]),
    reason: p.reason,
    category:
      p.title.includes("housing") || p.title.includes("move-in")
        ? "HOUSING"
        : p.title.includes("airport")
          ? "TRANSPORT"
          : p.title.includes("phone")
            ? "CONNECTIVITY"
            : p.title.includes("costs")
              ? "MONEY"
              : p.title.includes("grocery")
                ? "FOOD"
                : p.title.includes("transit")
                  ? "MOBILITY"
                  : "SETUP",
    estimateMinutes: p.title === "Find housing" ? undefined : 10 + ((i * 7) % 20),
  }));

  return { priorities: topPriorities, tasks };
}
