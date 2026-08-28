import { z } from "zod";
import { env, flags } from "@/shared/env";
import type { AIRequest, AIService, ChatResponse } from "../ai-service";

/**
 * OpenAI implementation behind the AIService abstraction.
 * Uses plain fetch — no SDK dependency required.
 */

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  return JSON.parse(trimmed.slice(start, end + 1));
}

export class OpenAIProvider implements AIService {
  readonly providerName: string;

  constructor() {
    this.providerName = `openai:${env.openaiModel}`;
  }

  private async complete(
    messages: ChatMessage[],
    jsonMode: boolean,
  ): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: env.openaiModel,
        temperature: jsonMode ? 0.4 : 0.7,
        max_tokens: 1600,
        messages,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? "";
  }

  private buildMessages(request: AIRequest): ChatMessage[] {
    const messages: ChatMessage[] = [];
    if (request.system) messages.push({ role: "system", content: request.system });
    for (const h of request.history ?? []) {
      messages.push({ role: h.role, content: h.content });
    }
    messages.push({
      role: "user",
      content:
        (request.instruction ? `${request.instruction}\n\n` : "") +
        `CONTEXT:\n${JSON.stringify(request.context)}`,
    });
    return messages;
  }

  async generateStructured<S extends z.ZodTypeAny>(
    request: AIRequest,
    schema: S,
  ): Promise<z.infer<S>> {
    let lastError: unknown = null;
    // One validation-retry loop keeps raw LLM output from bypassing schema.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await this.complete(this.buildMessages(request), true);
        const parsed = schema.parse(extractJson(raw));
        return parsed as z.infer<S>;
      } catch (err) {
        lastError = err;
        if (err instanceof z.ZodError) {
          request = {
            ...request,
            instruction: `${request.instruction ?? ""}\nYour previous output failed schema validation: ${err.message}. Return strictly valid JSON.`,
          };
          continue;
        }
        break;
      }
    }
    console.error("[openai] structured generation failed:", lastError);
    throw new Error("AI structured generation failed");
  }

  async chat(request: AIRequest): Promise<ChatResponse> {
    if (!flags.liveAI) throw new Error("OpenAI not configured");
    const text = await this.complete(this.buildMessages(request), false);
    return { text: text.trim() };
  }
}
