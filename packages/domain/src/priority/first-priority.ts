import type { HousingStatus } from "../relocation/types.js";
import type { Priority, TaskCategory } from "../tasks/types.js";

export interface FirstPriorityInput {
  housingStatus: HousingStatus;
  daysUntilArrival: number;
  destination: string;
}

export interface PriorityItem {
  key: string;
  title: string;
  reason: string;
  priority: Priority;
  category: TaskCategory;
}

function days(n: number): string {
  return `${String(n)} ${n === 1 ? "day" : "days"}`;
}

/** The single most important next step, from the mover's own answers (first rule that matches wins). */
export function computeFirstPriority(input: FirstPriorityInput): PriorityItem {
  const { housingStatus, daysUntilArrival: n, destination } = input;

  if (housingStatus === "SEARCHING") {
    const reason =
      n > 0
        ? `You arrive in ${destination} in ${days(n)} without secured housing — this blocks everything else.`
        : n === 0
          ? `You arrive in ${destination} today without secured housing — make this today's focus.`
          : `You are in ${destination} without secured housing — make this today's focus.`;
    return {
      key: "housing.find",
      title: "Find housing",
      reason,
      priority: "CRITICAL",
      category: "HOUSING",
    };
  }

  if (n < 0) {
    return {
      key: "places.find_essentials",
      title: "Find groceries and a pharmacy near home",
      reason: "Knowing where the basics are makes the first week easier.",
      priority: "MEDIUM",
      category: "DAILY_LIVING",
    };
  }

  if (n <= 14) {
    return {
      key: "arrival.airport_transport",
      title: "Arrange airport transportation",
      reason: "Arrival is close — decide how you get from the airport to your new home.",
      priority: "HIGH",
      category: "TRAVEL",
    };
  }

  return {
    key: "housing.confirm_move_in",
    title: "Confirm move-in details and keys",
    reason: "Confirm entry instructions, keys and what is included to avoid arrival-day surprises.",
    priority: "HIGH",
    category: "HOUSING",
  };
}
