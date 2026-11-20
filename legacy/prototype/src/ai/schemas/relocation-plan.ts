import { z } from "zod";

/**
 * Structured output contract for the Relocation Planning Agent (spec §13).
 * LLM output is schema-validated, then business-validated, then persisted.
 */

export const PriorityEnum = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

export const PlanPhaseEnum = z.enum([
  "BEFORE_ARRIVAL",
  "FIRST_24_HOURS",
  "FIRST_7_DAYS",
  "ONGOING",
]);

export const RelocationPlanSchema = z.object({
  summary: z.string().min(1),

  priorities: z
    .array(
      z.object({
        title: z.string().min(1),
        priority: PriorityEnum,
        reason: z.string(),
      }),
    )
    .max(8),

  first24Hours: z.array(z.string()).min(1),

  first7Days: z.array(
    z.object({
      day: z.number().int().min(1).max(7),
      tasks: z.array(z.string()),
    }),
  ),

  ongoing: z.array(z.string()).default([]),
});

/** Extended plan payload that also seeds the Task table. */
export const GeneratedTaskSchema = z.object({
  title: z.string().min(1),
  priority: PriorityEnum,
  phase: PlanPhaseEnum,
  reason: z.string().default(""),
  category: z.string().optional(),
  estimateMinutes: z.number().int().positive().optional(),
});

export const ExtendedRelocationPlanSchema =
  RelocationPlanSchema.extend({
    tasks: z.array(GeneratedTaskSchema).max(12).default([]),
  });

export type RelocationPlan = z.infer<typeof RelocationPlanSchema>;
export type ExtendedRelocationPlan = z.infer<typeof ExtendedRelocationPlanSchema>;
export type GeneratedTask = z.infer<typeof GeneratedTaskSchema>;
