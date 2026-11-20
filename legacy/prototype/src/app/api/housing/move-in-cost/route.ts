import { ok, withAuth } from "@/shared/http";
import { evaluateHousingOption } from "@/modules/housing/housing-service";

export const dynamic = "force-dynamic";

/** POST /api/housing/move-in-cost — move-in cash breakdown (spec §17). */
export const POST = withAuth(async (req, _ctx, userId) => {
  const result = await evaluateHousingOption(userId, await req.json());
  return ok({ moveIn: result.moveIn });
});
