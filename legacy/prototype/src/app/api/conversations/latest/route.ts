import { ok, withAuth } from "@/shared/http";
import { getChatHistory } from "@/modules/concierge/concierge-service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, _ctx, userId) => {
  return ok(await getChatHistory(userId));
});
