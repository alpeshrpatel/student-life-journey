import { ok, withAuth, parseJson } from "@/shared/http";
import { evaluateHousingOption } from "@/modules/housing/housing-service";

export const dynamic = "force-dynamic";

/** POST /api/housing/evaluate — full monthly + move-in evaluation. */
export const POST = withAuth(async (req, _ctx, userId) => {
  const body = await req.json();
  return ok(await evaluateHousingOption(userId, body));
});
