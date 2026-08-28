/**
 * Shared domain types. The UserContext (spec §8) is the single structured
 * state every agent reads — extend it, never fork it.
 */
import type { z } from "zod";
import type {
  Priority,
  PlanPhase,
  TaskStatus,
} from "@prisma/client";
import type { RelocationPlanSchema } from "@/ai/schemas/relocation-plan";

export type PriorityValue = Priority;
export type PlanPhaseValue = PlanPhase;
export type TaskStatusValue = TaskStatus;

export interface TaskDTO {
  id: string;
  title: string;
  description: string | null;
  reason: string | null;
  priority: PriorityValue;
  phase: PlanPhaseValue;
  status: TaskStatusValue;
  category: string | null;
  estimateMinutes: number | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface UserContext {
  userId: string;
  name: string | null;

  relocation: {
    origin: string;
    destination: string;
    arrivalDate: Date;
    arrivalTime?: string;
    homeAddress?: string;
    destinationLat?: number;
    destinationLng?: number;
  };

  housing: {
    status: "SECURED" | "SEARCHING";
    budget?: number;
  };

  finances: {
    monthlyBudget?: number;
  };

  transportation: {
    preferences?: string[];
  };

  preferences: {
    interests?: string[];
  };

  tasks: TaskDTO[];

  /** Derived convenience fields */
  daysUntilArrival: number;
}

export interface DashboardData {
  greetingName: string;
  daysUntilArrival: number;
  arrived: boolean;
  origin: string;
  destination: string;
  housingStatus: "SECURED" | "SEARCHING";
  topPriorities: TaskDTO[];
  nextAction: {
    kind: "HOUSING_REVIEW" | "TASK" | "PLAN_REGENERATE" | "ONBOARD_PLACES";
    title: string;
    description: string;
    href: string;
  } | null;
  stats: {
    openTasks: number;
    doneTasks: number;
    planVersion: number | null;
    planGeneratedAt: string | null;
  };
}

export type RelocationPlan = z.infer<typeof RelocationPlanSchema>;

export interface LifePlanDTO {
  id: string;
  summary: string;
  priorities: RelocationPlan["priorities"];
  first24Hours: string[];
  first7Days: { day: number; tasks: string[] }[];
  ongoing: string[];
  generatedBy: string;
  version: number;
  updatedAt: string;
}
