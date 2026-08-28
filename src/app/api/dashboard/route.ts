import { ok, withAuth } from "@/shared/http";
import { getDashboard } from "@/modules/tasks/dashboard-service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, _ctx, userId) => {
  return ok(await getDashboard(userId));
});
