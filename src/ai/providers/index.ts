import { flags } from "@/shared/env";
import type { AIService } from "../ai-service";
import { OpenAIProvider } from "./openai-provider";
import { HeuristicProvider } from "./heuristic/provider";

let cached: AIService | null = null;

/**
 * Single access point for AI capabilities. Business modules never import a
 * concrete provider — swap providers here without touching agents/modules.
 */
export function getAIService(): AIService {
  if (!cached) {
    cached = flags.liveAI ? new OpenAIProvider() : new HeuristicProvider();
  }
  return cached;
}
