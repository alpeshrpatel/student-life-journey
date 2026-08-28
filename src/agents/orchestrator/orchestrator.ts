import type { ChatIntent } from "@/ai/schemas";
import type { UserContext } from "@/shared/types";
import {
  calculateHousingCost,
  calculateMoveInCost,
  evaluateAffordability,
} from "@/tools/calculator/housing-calculator";
import { conciergeAgent } from "@/agents/concierge-agent";
import { tools } from "@/tools/registry";
import { ensureJobsWired } from "@/jobs/events";
import {
  classifyIntent,
  detectPlaceCategory,
  extractAmounts,
} from "./intent";
import {
  getOrCreateConversation,
  appendMessage,
  getRecentMessages,
} from "@/repositories/conversation-repository";

/**
 * Agent Orchestrator (spec §7):
 * request → load context → understand intent → select agent/tool →
 * execute → validate → update state → respond.
 */

async function resolveAnchor(
  ctx: UserContext,
): Promise<{ lat: number; lng: number; label: string } | null> {
  const rp = ctx.relocation;
  if (rp.destinationLat != null && rp.destinationLng != null) {
    return {
      lat: rp.destinationLat,
      lng: rp.destinationLng,
      label: rp.homeAddress ?? rp.destination,
    };
  }
  if (rp.destination) {
    const geo = await tools.geocode(rp.destination);
    if (geo) return { lat: geo.lat, lng: geo.lng, label: rp.destination };
  }
  return null;
}

export interface AgentChatResult {
  reply: string;
  intent: ChatIntent;
  agentUsed: string;
}

export const orchestrator = {
  async run(userId: string, message: string): Promise<AgentChatResult> {
    ensureJobsWired();
    const ctx = await tools.getUserContext(userId);
    const intent = await classifyIntent(message);

    let agentUsed = "Concierge Agent";
    const data: Record<string, unknown> = {};

    switch (intent) {
      case "TODAY_PLAN":
      case "TOP_TASKS": {
        agentUsed = "Planning Agent";
        const { getTopPriorities } = await import("@/modules/tasks/task-service");
        const topTasks = await getTopPriorities(ctx.userId, intent === "TOP_TASKS" ? 5 : 3);
        data.topTasks = topTasks.map((t) => ({ title: t.title, priority: t.priority }));
        break;
      }
      case "PLACES": {
        agentUsed = "Places Tool";
        const category = detectPlaceCategory(message);
        const anchor = await resolveAnchor(ctx);
        if (anchor && category) {
          const results = await tools.searchPlaces(anchor, category, 4000);
          data.places = results.slice(0, 4).map((p) => ({ name: p.name, address: p.address }));
          data.placeCategory = category.toLowerCase();
        }
        break;
      }
      case "AFFORDABILITY": {
        agentUsed = "Housing Agent";
        const amounts = extractAmounts(message);
        if (amounts.length > 0) {
          // Rent-only rough estimate — clearly labeled as such.
          const rent = amounts[0];
          const housingCost = calculateHousingCost({ rent });
          const moveIn = calculateMoveInCost({
            rent,
            connectivitySetup: 40,
            initialGroceries: 90,
          });
          data.evaluation = {
            ...evaluateAffordability(housingCost, moveIn, {
              housingBudget: ctx.housing.budget ?? null,
              monthlyBudget: ctx.finances.monthlyBudget ?? null,
            }),
            note: "Rent-only rough estimate from your message — add utilities/internet in the Housing tab for precision.",
          };
        }
        break;
      }
      default:
        break;
    }

    const conversation = await getOrCreateConversation(userId);
    const history = await getRecentMessages(conversation.id);

    const reply = await conciergeAgent.reply({
      message,
      ctx,
      intent,
      history,
      data,
    });

    // Persist transcript (spec §15 — never the primary state source)
    await appendMessage(conversation.id, "USER", message);
    await appendMessage(conversation.id, "ASSISTANT", reply, agentUsed);

    return { reply, intent, agentUsed };
  },
};
