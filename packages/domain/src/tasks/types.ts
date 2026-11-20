import { z } from "zod";

export const PrioritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const TaskCategorySchema = z.enum([
  "TRAVEL",
  "HOUSING",
  "CONNECTIVITY",
  "FOOD",
  "TRANSPORT",
  "MONEY",
  "SAFETY",
  "HEALTH",
  "DAILY_LIVING",
]);
export type TaskCategory = z.infer<typeof TaskCategorySchema>;
