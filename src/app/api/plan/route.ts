import { ok, withAuth } from "@/shared/http";
import { getLatestPlan } from "@/modules/plans/life-plan-service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, _ctx, userId) => {
  return ok({ plan: await getLatestPlan(userId) });
});
