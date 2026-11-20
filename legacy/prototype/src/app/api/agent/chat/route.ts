import { ok, withAuth, parseJson } from "@/shared/http";
import { ChatSchema, handleChat } from "@/modules/concierge/concierge-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/agent/chat — the AI Life Concierge entry point. */
export const POST = withAuth(async (req, _ctx, userId) => {
  const { message } = await parseJson(req, ChatSchema);
  return ok(await handleChat(userId, message));
});
