import { z } from "zod";
import { orchestrator } from "@/agents/orchestrator/orchestrator";
import { getOrCreateConversation, getRecentMessages } from "@/repositories/conversation-repository";

/** AI Life Concierge module — thin persistence layer over the orchestrator. */

export const ChatSchema = z.object({
  message: z.string().trim().min(1).max(1000),
});

export async function handleChat(userId: string, message: string) {
  return orchestrator.run(userId, message);
}

export async function getChatHistory(userId: string) {
  const conversation = await getOrCreateConversation(userId);
  const messages = await getRecentMessages(conversation.id, 50);
  return { conversationId: conversation.id, messages };
}
