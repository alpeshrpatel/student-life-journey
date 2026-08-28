import { z } from "zod";
import { PriorityEnum } from "./relocation-plan";

export type ChatIntent =
  | "TODAY_PLAN"
  | "AFFORDABILITY"
  | "SHOPPING_LIST"
  | "TOP_TASKS"
  | "PLACES"
  | "TRANSPORTATION"
  | "FLIGHT_PREP"
  | "GENERAL";

export const IntentSchema = z.object({
  intent: z.enum([
    "TODAY_PLAN",
    "AFFORDABILITY",
    "SHOPPING_LIST",
    "TOP_TASKS",
    "PLACES",
    "TRANSPORTATION",
    "FLIGHT_PREP",
    "GENERAL",
  ]),
});

export const AffordabilityExplanationSchema = z.object({
  verdict: z.enum(["COMPATIBLE", "TIGHT", "OVER"]),
  explanation: z.string(),
  tips: z.array(z.string()).max(5),
});

export { PriorityEnum };
