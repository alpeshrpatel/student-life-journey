import { getAIService } from "@/ai/providers";
import { conciergeSystemPrompt } from "@/ai/prompts";
import { toSafeContext } from "@/ai/prompts";
import type { ChatIntent } from "@/ai/schemas";
import type { UserContext } from "@/shared/types";

export interface ConciergeInput {
  message: string;
  ctx: UserContext;
  intent: ChatIntent;
  history: { role: "user" | "assistant"; content: string }[];
  data?: Record<string, unknown>; // tool results to ground the reply
}

export const conciergeAgent = {
  /**
   * Conversational interface grounded in shared context + tool results.
   * Does not duplicate specialized capabilities — the orchestrator routes
   * housing math and places lookups before reaching this agent.
   */
  async reply(input: ConciergeInput): Promise<string> {
    const ai = getAIService();

    if (ai.providerName === "heuristic") {
      const res = await ai.chat({
        task: "CONCIERGE_REPLY",
        context: {
          intent: input.intent,
          userContext: input.ctx,
          data: input.data ?? {},
        },
      });
      return res.text;
    }

    // Live LLM path — fully grounded chat with conversation history.
    const res = await ai.chat({
      system: conciergeSystemPrompt(),
      history: input.history.slice(-8),
      instruction:
        `USER MESSAGE: ${input.message}\n\nINTENT CLASSIFIED AS: ${input.intent}\n` +
        (input.data && Object.keys(input.data).length > 0
          ? `TOOL RESULTS you must use when relevant:\n${JSON.stringify(input.data)}`
          : ""),
      context: toSafeContext(input.ctx) as unknown as Record<string, unknown>,
    });
    return res.text;
  },
};
