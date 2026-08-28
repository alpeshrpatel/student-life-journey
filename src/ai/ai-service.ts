import type { z } from "zod";

/**
 * AIService abstraction (spec §12): agents depend on this interface only.
 * Implementations: OpenAIProvider (live) / HeuristicProvider (offline).
 */

export type AiTask =
  | "RELOCATION_PLAN_GENERATE"
  | "HOUSING_EXPLAIN"
  | "CONCIERGE_REPLY";

export interface AIRequest {
  task: AiTask;
  system?: string;
  instruction?: string;
  context: Record<string, unknown>;
  history?: { role: "user" | "assistant"; content: string }[];
}

export interface ChatResponse {
  text: string;
}

export interface AIService {
  readonly providerName: string;

  generateStructured<S extends z.ZodTypeAny>(
    request: AIRequest,
    schema: S,
  ): Promise<z.infer<S>>;

  chat(request: AIRequest): Promise<ChatResponse>;
}
