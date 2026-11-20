import type { ChatIntent } from "@/ai/schemas";
import { IntentSchema } from "@/ai/schemas";
import { flags } from "@/shared/env";
import { getAIService } from "@/ai/providers";
import type { PlaceCategory } from "@/tools/maps/location-provider";

const PATTERN_RULES: [RegExp, ChatIntent][] = [
  [/\b(what (should|do) i do (today|now|next)|my day|start with)\b/i, "TODAY_PLAN"],
  [/\b(can i afford|afford this|affordable|move.?in cost|how much.*(apartment|rent|place))\b/i, "AFFORDABILITY"],
  [/\b(buy when i arrive|groceries|grocery list|shopping list|first shop)\b/i, "SHOPPING_LIST"],
  [/\b(most important tasks|top tasks|my tasks|priorities|to.?do)\b/i, "TOP_TASKS"],
  [/\b(pharmacy|drugstore|grocery store|supermarket|nearest|near me|where can i (buy|find)|laundr|clinic|doctor|hospital|transit station|bus stop)\b/i, "PLACES"],
  [/\b(get around|transportation|metro|subway|bus pass|transit card|commute)\b/i, "TRANSPORTATION"],
  [/\b(flight|airport|before i (fly|leave|arrive)|packing|prepare before)\b/i, "FLIGHT_PREP"],
];

/** Deterministic keyword classification; optional LLM refinement when live. */
export async function classifyIntent(message: string): Promise<ChatIntent> {
  for (const [pattern, intent] of PATTERN_RULES) {
    if (pattern.test(message)) return intent;
  }
  if (!flags.liveAI) return "GENERAL";
  try {
    const ai = getAIService();
    const result = await ai.generateStructured(
      {
        task: "CONCIERGE_REPLY",
        system:
          'Classify the user message into exactly one intent: TODAY_PLAN | AFFORDABILITY | SHOPPING_LIST | TOP_TASKS | PLACES | TRANSPORTATION | FLIGHT_PREP | GENERAL. Return JSON {"intent":"..."}.',
        instruction: `Message: ${message}`,
        context: {},
      },
      IntentSchema,
    );
    return result.intent;
  } catch {
    return "GENERAL";
  }
}

export function detectPlaceCategory(message: string): PlaceCategory | null {
  const m = message.toLowerCase();
  if (/pharmac|drugstore|medicine|prescription/.test(m)) return "PHARMACY";
  if (/grocer|supermarket|food shop|market/.test(m)) return "GROCERY";
  if (/clinic|doctor|hospital|urgent care|healthcare/.test(m)) return "HEALTHCARE";
  if (/laundr/.test(m)) return "LAUNDRY";
  if (/transit|metro|subway|bus stop|train station/.test(m)) return "TRANSIT";
  return null;
}

/** Rent-only quick estimate from numbers found in the user's message. */
export function extractAmounts(message: string): number[] {
  const matches = message.matchAll(/\$?\s?(\d{3,5}(?:[.,]\d{2})?)\b/g);
  const amounts: number[] = [];
  for (const m of matches) {
    const n = parseFloat(m[1].replace(",", ""));
    if (!Number.isNaN(n) && n >= 100 && n <= 20000) amounts.push(n);
  }
  return [...new Set(amounts)].slice(0, 4);
}
