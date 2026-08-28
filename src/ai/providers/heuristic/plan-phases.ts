import type { UserContext } from "@/shared/types";
import { formatMoney } from "@/shared/utils";
import type { GeneratedTask } from "@/ai/schemas/relocation-plan";

interface PlanPriority {
  title: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  reason: string;
}

/** Builds the phase content (24h / 7 days / ongoing) + plan summary. */
export function buildPlanPhases(
  ctx: UserContext,
  priorities: PlanPriority[],
): Pick<
  ExtendedPlan,
  "summary" | "first24Hours" | "first7Days" | "ongoing"
> {
  const dest = ctx.relocation.destination;
  const days = ctx.daysUntilArrival;
  const budget = ctx.finances.monthlyBudget;
  const interests = ctx.preferences.interests ?? [];

  const first24Hours = [
    "Confirm entry instructions and collect your keys",
    "Get your phone connected (local SIM/eSIM or verify roaming)",
    `Download offline maps of ${dest}`,
    "Save key contacts offline: landlord, local emergency number, one trusted person",
    "Locate the nearest grocery store and buy basics (water, breakfast, toiletries)",
    "Walk one block around your home and note the closest transit stop",
  ];

  const interestLine =
    interests.length > 0
      ? `Find one spot in ${dest} related to ${interests[0].toLowerCase()} and check it out`
      : `Pick one neighborhood of ${dest} and explore it on foot`;

  const first7Days = [
    { day: 1, tasks: ["Settle into your home — unpack essentials", "Buy any missing home basics"] },
    { day: 2, tasks: ["Set up local transit payment (card or app)", "Do one test trip across the city center"] },
    {
      day: 3,
      tasks: budget
        ? [`Set up simple expense tracking against your ${formatMoney(budget)} monthly budget`, "Note every purchase from day 1–3"]
        : ["Set a weekly spending note — write down every purchase", "Define a rough weekly food budget"],
    },
    { day: 4, tasks: ["Identify nearest pharmacy and urgent care; save their addresses", "Refill any prescription you carry"] },
    { day: 5, tasks: [interestLine] },
    { day: 6, tasks: ["Organize documents folder (ID, lease, insurance) — scan or photograph them"] },
    { day: 7, tasks: ["First-week review: spending vs budget, what surprised you", "Adjust next week's grocery & transit plan"] },
  ];

  const ongoing = [
    budget
      ? `Weekly money review against your ${formatMoney(budget)} budget`
      : "Weekly money review — keep a simple written total",
    "Build a stable routine: sleep, meals, study/work blocks",
    "Join one community or club connected to your interests",
    "Keep a document backup (photos of ID, lease, visa if any)",
    "Revisit this plan after any major change (new job, new home)",
  ];

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`You're moving from ${ctx.relocation.origin} to ${dest}, arriving in ${days} day${days === 1 ? "" : "s"}.`);
  } else if (days === 0) {
    parts.push(`Today is arrival day in ${dest}!`);
  } else {
    parts.push(`You arrived in ${dest} ${-days} day${days === -1 ? "" : "s"} ago.`);
  }
  parts.push(
    ctx.housing.status === "SEARCHING"
      ? `Housing is still SEARCHING, so securing a home is priority #1${ctx.housing.budget ? ` within your ${formatMoney(ctx.housing.budget)} housing budget` : ""}.`
      : "Your housing is SECURED — focus shifts to a smooth landing and settling in.",
  );
  parts.push(
    budget
      ? `Work through the priorities below before and right after arrival to stay inside your ${formatMoney(budget)} monthly budget.`
      : "Work through the priorities below in order — each one removes a risk from your move.",
  );

  void priorities;

  return { summary: parts.join(" "), first24Hours, first7Days, ongoing };
}

interface ExtendedPlan {
  summary: string;
  first24Hours: string[];
  first7Days: { day: number; tasks: string[] }[];
  ongoing: string[];
}

export type { PlanPriority };
export type { GeneratedTask };
