import { ok, fail, ApiError } from "@/shared/http";
import { getSessionUserId } from "@/shared/auth/session";
import { generatePlan } from "@/modules/plans/life-plan-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/plan/generate — runs the Relocation Planning Agent. */
export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return fail("Not authenticated", 401);
    let reason = "manual";
    try {
      const body = (await req.json()) as { reason?: string };
      if (body?.reason && typeof body.reason === "string") {
        reason = body.reason.slice(0, 60);
      }
    } catch {
      // body optional
    }
    return ok({ plan: await generatePlan(userId, reason) });
  } catch (err) {
    if (err instanceof ApiError) return fail(err.message, err.status);
    console.error("[plan/generate]", err);
    return fail("Could not generate plan right now", 500);
  }
}
