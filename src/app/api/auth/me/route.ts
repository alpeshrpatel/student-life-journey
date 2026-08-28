import { ok, withAuth } from "@/shared/http";
import { getProfile } from "@/modules/users/profile-service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, _ctx, userId) => {
  return ok(await getProfile(userId));
});
