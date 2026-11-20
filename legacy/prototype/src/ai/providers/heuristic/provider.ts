import { z } from "zod";
import { formatMoney } from "@/shared/utils";
import type { UserContext } from "@/shared/types";
import type {
  ExtendedRelocationPlan,
} from "@/ai/schemas/relocation-plan";
import type { AIRequest, AIService, ChatResponse } from "@/ai/ai-service";
import { buildPrioritiesAndTasks } from "./plan-builder";
import { buildPlanPhases } from "./plan-phases";

interface HousingEvalShape {
  verdict?: "COMPATIBLE" | "TIGHT" | "OVER";
  monthlyTotal?: number;
  moveInTotal?: number;
  referenceBudget?: number;
  rentShareOfBudget?: number;
  flags?: string[];
}

function explainHousing(evalData: HousingEvalShape): {
  verdict: "COMPATIBLE" | "TIGHT" | "OVER";
  explanation: string;
  tips: string[];
} {
  const verdict = evalData.verdict ?? "TIGHT";
  const monthly = formatMoney(evalData.monthlyTotal);
  const moveIn = formatMoney(evalData.moveInTotal);
  const budget = evalData.referenceBudget
    ? formatMoney(evalData.referenceBudget)
    : null;
  const share =
    evalData.rentShareOfBudget != null
      ? Math.round(evalData.rentShareOfBudget * 100)
      : null;

  let headline: string;
  if (verdict === "COMPATIBLE") {
    headline = `This option looks compatible with your budget${budget ? ` of ${budget}/month` : ""}: the real monthly cost is about ${monthly}${share != null ? `, and rent alone is ~${share}% of your budget` : ""}.`;
  } else if (verdict === "TIGHT") {
    headline = `This option is tight${budget ? ` against your ${budget}/month budget` : ""}. The real monthly cost is about ${monthly}${share != null ? ` (rent ≈ ${share}% of budget)` : ""} — possible, but leaves little room for surprises.`;
  } else {
    headline = `This option appears over budget${budget ? ` — your budget is ${budget}/month but the real cost lands near ${monthly}` : ` at roughly ${monthly}/month`}. Consider negotiating, roommates, or looking further from the center.`;
  }

  const explanation = `${headline} Move-in will require approximately ${moveIn} in cash (first month, deposit, setup). These numbers use YOUR inputs — always confirm final amounts directly with the landlord. This is not a verification of the property itself.`;

  const tips = [
    "Ask exactly which utilities are included in the rent — get it in writing.",
    "Never pay a deposit before signing an agreement and seeing the place live or on video.",
    ...(verdict !== "COMPATIBLE"
      ? ["Look slightly cheaper, or add a roommate to bring the share down."]
      : ["Keep the move-in amount plus ~15% buffer saved before committing."]),
    ...(evalData.flags ?? []).slice(0, 2),
  ];

  return { verdict, explanation, tips };
}

export class HeuristicProvider implements AIService {
  readonly providerName = "heuristic";

  async generateStructured<S extends z.ZodTypeAny>(
    request: AIRequest,
    schema: S,
  ): Promise<z.infer<S>> {
    let result: unknown;
    switch (request.task) {
      case "RELOCATION_PLAN_GENERATE": {
        const ctx = request.context.userContext as UserContext;
        const { priorities, tasks } = buildPrioritiesAndTasks(ctx);
        const phases = buildPlanPhases(ctx, priorities);
        result = { ...phases, priorities, tasks } satisfies ExtendedRelocationPlan;
        break;
      }
      case "HOUSING_EXPLAIN":
        result = explainHousing(
          (request.context.evaluation ?? {}) as HousingEvalShape,
        );
        break;
      case "CONCIERGE_REPLY": {
        const { buildConciergeReply } =
          await import("./concierge-brain");
        return schema.parse(buildConciergeReply(request)) as z.infer<S>;
      }
      default:
        throw new Error(`Unknown AI task: ${request.task}`);
    }
    return schema.parse(result) as z.infer<S>;
  }

  async chat(request: AIRequest): Promise<ChatResponse> {
    const { buildConciergeReply } = await import("./concierge-brain");
    return buildConciergeReply(request);
  }
}
