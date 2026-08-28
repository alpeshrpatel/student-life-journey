import { z } from "zod";
import { AffordabilityExplanationSchema } from "@/ai/schemas";
import { getAIService } from "@/ai/providers";
import { housingExplainPrompt } from "@/ai/prompts";
import type { AffordabilityEvaluation } from "@/tools/calculator/housing-calculator";

const OutputSchema = z.object({
  explanation: z.string(),
  tips: z.array(z.string()).max(6),
});

export interface HousingExplanation {
  verdict: AffordabilityEvaluation["verdict"];
  explanation: string;
  tips: string[];
}

export const housingAgent = {
  /**
   * Explains a deterministically-computed affordability evaluation.
   * The verdict ALWAYS comes from application code — even if a live LLM
   * disagrees, we override it (AI explains; software decides — spec §21).
   */
  async explain(evaluation: AffordabilityEvaluation): Promise<HousingExplanation> {
    const ai = getAIService();

    if (ai.providerName === "heuristic") {
      // Heuristic provider composes explanation from verified numbers.
      const result = await ai.generateStructured(
        { task: "HOUSING_EXPLAIN", context: { evaluation } },
        z.object({
          verdict: z.enum(["COMPATIBLE", "TIGHT", "OVER"]),
          explanation: z.string(),
          tips: z.array(z.string()),
        }),
      );
      return { verdict: evaluation.verdict, explanation: result.explanation, tips: result.tips };
    }

    const raw = await ai.generateStructured(
      {
        task: "HOUSING_EXPLAIN",
        system: housingExplainPrompt().system,
        instruction:
          "Explain this affordability evaluation to the user in 3–4 sentences, mobile-friendly tone.",
        context: { evaluation },
      },
      OutputSchema,
    );

    return {
      verdict: evaluation.verdict, // deterministic override
      explanation: raw.explanation,
      tips: raw.tips,
    };
  },
};
