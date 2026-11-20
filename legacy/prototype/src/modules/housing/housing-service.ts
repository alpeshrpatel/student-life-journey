import { z } from "zod";
import { db } from "@/shared/db";
import { ApiError } from "@/shared/http";
import {
  calculateHousingCost,
  calculateMoveInCost,
  evaluateAffordability,
  type AffordabilityEvaluation,
  type HousingCostResult,
  type MoveInCostResult,
} from "@/tools/calculator/housing-calculator";
import { housingAgent, type HousingExplanation } from "@/agents/housing-agent";

/**
 * Housing & Cost Evaluation (spec §3.5).
 * Deterministic math here; the AI only explains the computed result.
 */

/** Full evaluation request: monthly recurring + one-time move-in inputs. */
export const HousingEvaluationSchema = z.object({
  // Monthly
  rent: z.number().min(0),
  utilities: z.number().min(0).default(0),
  internet: z.number().min(0).default(0),
  transportation: z.number().min(0).default(0),
  laundry: z.number().min(0).default(0),
  recurringFees: z.number().min(0).default(0),
  // Move-in one-time
  deposit: z.number().min(0).optional(), // blank → assumed 1 month rent
  applicationFee: z.number().min(0).default(0),
  connectivitySetup: z.number().min(0).optional(),
  furnitureSetup: z.number().min(0).default(0),
  initialGroceries: z.number().min(0).optional(),
  transportationSetup: z.number().min(0).default(0),
});
export type HousingEvaluationInput = z.infer<typeof HousingEvaluationSchema>;

export interface HousingEvaluationResponse {
  monthly: HousingCostResult;
  moveIn: MoveInCostResult;
  evaluation: AffordabilityEvaluation;
  explanation: HousingExplanation;
}

async function loadBudgets(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { housingProfile: true, relocationProfile: true },
  });
  if (!user?.relocationProfile) {
    throw new ApiError("Complete onboarding first", 409);
  }
  return {
    housingBudget: user.housingProfile?.budget ?? null,
    monthlyBudget: user.relocationProfile.monthlyBudget ?? null,
  };
}

export async function evaluateHousingOption(
  userId: string,
  rawInput: unknown,
): Promise<HousingEvaluationResponse> {
  const input = HousingEvaluationSchema.parse(rawInput);
  const budgets = await loadBudgets(userId);

  const monthly = calculateHousingCost({
    rent: input.rent,
    utilities: input.utilities,
    internet: input.internet,
    transportation: input.transportation,
    laundry: input.laundry,
    recurringFees: input.recurringFees,
  });

  const moveIn = calculateMoveInCost({
    rent: input.rent,
    deposit: input.deposit,
    applicationFee: input.applicationFee,
    connectivitySetup: input.connectivitySetup ?? 40,
    furnitureSetup: input.furnitureSetup,
    initialGroceries: input.initialGroceries ?? 90,
    transportationSetup: input.transportationSetup,
  });

  const evaluation = evaluateAffordability(monthly, moveIn, budgets);
  const explanation = await housingAgent.explain(evaluation);

  return { monthly, moveIn, evaluation, explanation };
}
