import {
  ExtendedRelocationPlanSchema,
  type ExtendedRelocationPlan,
} from "@/ai/schemas/relocation-plan";
import { getAIService } from "@/ai/providers";
import { relocationPlanPrompt } from "@/ai/prompts";
import type { UserContext } from "@/shared/types";

/** Business validation applied AFTER schema validation (spec §13). */
function businessValidate(plan: ExtendedRelocationPlan): ExtendedRelocationPlan {
  const seen = new Set<string>();
  const dedupe = <T extends { title: string }>(items: T[]): T[] => {
    const out: T[] = [];
    for (const item of items) {
      const key = item.title.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(item);
      }
    }
    return out;
  };

  const daysSeen = new Set<number>();

  return {
    summary: plan.summary.slice(0, 1200),
    priorities: dedupe(
      plan.priorities
        .filter((p) => p.title.trim().length > 2)
        .slice(0, 6),
    ),
    first24Hours: plan.first24Hours.slice(0, 8),
    first7Days: plan.first7Days
      .filter((d) => d.day >= 1 && d.day <= 7 && !daysSeen.has(d.day))
      .map((d) => (daysSeen.add(d.day), { day: d.day, tasks: d.tasks.slice(0, 5) }))
      .sort((a, b) => a.day - b.day)
      .slice(0, 7),
    ongoing: plan.ongoing.slice(0, 8),
    tasks: dedupe(plan.tasks.filter((t) => t.title.trim().length > 2)).map((t) => ({
      ...t,
      reason: t.reason.slice(0, 300),
      estimateMinutes: t.estimateMinutes ? Math.min(t.estimateMinutes, 240) : undefined,
    })),
  };
}

export interface GeneratedPlanResult {
  plan: ExtendedRelocationPlan;
  generatedBy: string;
}

export const relocationAgent = {
  /**
   * Agent lifecycle (spec §20): context in → structured validated plan out.
   * The agent never writes to the database itself — persistence is owned by
   * the plans service so state changes stay auditable.
   */
  async generatePlan(ctx: UserContext): Promise<GeneratedPlanResult> {
    const ai = getAIService();
    const prompt = relocationPlanPrompt();

    const raw = await ai.generateStructured(
      {
        task: "RELOCATION_PLAN_GENERATE",
        system: prompt.system,
        instruction: prompt.userContext(ctx),
        context: { userContext: ctx },
      },
      ExtendedRelocationPlanSchema,
    );

    return { plan: businessValidate(raw), generatedBy: ai.providerName };
  },
};
