import { db } from "@/shared/db";

export async function getOrCreateConversation(userId: string) {
  const existing = await db.conversation.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) return existing;
  return db.conversation.create({
    data: { userId, title: "Relocation chat" },
  });
}

export async function appendMessage(
  conversationId: string,
  role: "USER" | "ASSISTANT" | "SYSTEM",
  content: string,
  agentUsed?: string,
) {
  return db.conversationMessage.create({
    data: { conversationId, role, content, agentUsed },
  });
}

export async function getRecentMessages(
  conversationId: string,
  limit = 12,
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const rows = await db.conversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows
    .reverse()
    .filter((m) => m.role !== "SYSTEM")
    .map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));
}
