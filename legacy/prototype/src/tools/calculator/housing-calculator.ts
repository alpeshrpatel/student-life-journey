import { z } from "zod";

/**
 * Deterministic housing math (spec §10, §21).
 * The LLM never performs these calculations — it only explains the result.
 */

export const HousingCostInputSchema = z.object({
  rent: z.number().min(0),
  utilities: z.number().min(0).default(0),
  internet: z.number().min(0).default(0),
  transportation: z.number().min(0).default(0),
  laundry: z.number().min(0).default(0),
  recurringFees: z.number().min(0).default(0),
});
export type HousingCostInput = z.infer<typeof HousingCostInputSchema>;

export interface CostLine {
  label: string;
  amount: number;
}

export interface HousingCostResult {
  lines: CostLine[];
  total: number;
}

export function calculateHousingCost(input: HousingCostInput): HousingCostResult {
  const lines: CostLine[] = [
    { label: "Rent", amount: input.rent },
    { label: "Utilities", amount: input.utilities },
    { label: "Internet", amount: input.internet },
    { label: "Transportation", amount: input.transportation },
    { label: "Laundry", amount: input.laundry },
    { label: "Recurring fees", amount: input.recurringFees },
  ];
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { lines, total };
}

// ---------------------------------------------------------------------------

export const MoveInCostInputSchema = z.object({
  rent: z.number().min(0),
  deposit: z.number().min(0).optional(),
  applicationFee: z.number().min(0).default(0),
  connectivitySetup: z.number().min(0), // phone SIM / internet install
  furnitureSetup: z.number().min(0).default(0),
  initialGroceries: z.number().min(0), // first grocery run
  transportationSetup: z.number().min(0).default(0), // transit card / airport ride
});
export type MoveInCostInput = z.infer<typeof MoveInCostInputSchema>;

export interface MoveInCostResult {
  lines: (CostLine & { assumed?: boolean })[];
  total: number;
  assumptions: string[];
}

export function calculateMoveInCost(input: MoveInCostInput): MoveInCostResult {
  // Sensible defaults when a field is left blank — always surfaced as
  // labeled assumptions, never presented as verified prices.
  const deposit = input.deposit ?? Math.round(input.rent); // common norm: 1 month
  const assumptions: string[] = [];
  if (input.deposit == null) {
    assumptions.push("Deposit assumed at one month of rent — confirm with the landlord.");
  }

  const lines: (CostLine & { assumed?: boolean })[] = [
    { label: "First month rent", amount: input.rent },
    { label: "Security deposit", amount: deposit, assumed: input.deposit == null },
    { label: "Application fees", amount: input.applicationFee },
    { label: "Connectivity setup", amount: input.connectivitySetup },
    { label: "Furniture / setup basics", amount: input.furnitureSetup },
    { label: "Initial groceries", amount: input.initialGroceries },
    { label: "Transportation setup", amount: input.transportationSetup },
  ];
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { lines, total, assumptions };
}

// ---------------------------------------------------------------------------

export type AffordabilityVerdict = "COMPATIBLE" | "TIGHT" | "OVER";

export interface AffordabilityEvaluation {
  monthlyTotal: number;
  moveInTotal: number;
  referenceBudget: number;
  budgetSource: "HOUSING_BUDGET" | "MONTHLY_BUDGET";
  rentShareOfBudget: number; // 0..1+
  verdict: AffordabilityVerdict;
  flags: string[];
}

export function evaluateAffordability(
  housingCost: HousingCostResult,
  moveIn: MoveInCostResult,
  budgets: { housingBudget?: number | null; monthlyBudget?: number | null },
): AffordabilityEvaluation {
  const referenceBudget =
    budgets.housingBudget && budgets.housingBudget > 0
      ? budgets.housingBudget
      : (budgets.monthlyBudget ?? 0);

  const rentShare =
    referenceBudget > 0 ? housingCost.lines[0].amount / referenceBudget : 0;

  let verdict: AffordabilityVerdict = "COMPATIBLE";
  if (referenceBudget <= 0) verdict = "TIGHT"; // unknown budget → cautious
  else if (housingCost.total > referenceBudget) verdict = "OVER";
  else if (housingCost.total > referenceBudget * 0.85) verdict = "TIGHT";

  const flags: string[] = [];
  const rent = housingCost.lines[0].amount;

  if (rent > 0 && moveIn.lines[1].amount > rent * 2) {
    flags.push("Deposit is more than two months of rent — unusually high, ask why.");
  }
  if (housingCost.lines[1].amount === 0) {
    flags.push("No utilities included in the estimate — verify what the rent covers.");
  }
  if (referenceBudget > 0 && rentShare > 0.5) {
    flags.push("Rent alone takes over half your monthly budget.");
  }
  if (housingCost.lines[5].amount >= 50) {
    flags.push("Recurring fees are significant — check if they can be waived.");
  }
  if (
    referenceBudget > 0 &&
    verdict === "OVER" &&
    moveIn.total > referenceBudget * 3
  ) {
    flags.push("Move-in cash exceeds three months of budget — plan savings ahead.");
  }

  return {
    monthlyTotal: housingCost.total,
    moveInTotal: moveIn.total,
    referenceBudget,
    budgetSource:
      budgets.housingBudget && budgets.housingBudget > 0
        ? "HOUSING_BUDGET"
        : "MONTHLY_BUDGET",
    rentShareOfBudget: rentShare,
    verdict,
    flags,
  };
}
