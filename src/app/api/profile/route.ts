import { z } from "zod";
import { ok, withAuth } from "@/shared/http";
import { getProfile, updateProfile, UpdateProfileSchema } from "@/modules/users/profile-service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, _ctx, userId) => {
  return ok(await getProfile(userId));
});

export const PUT = withAuth(async (req: Request, _ctx, userId) => {
  const input = UpdateProfileSchema.parse(await req.json());
  return ok(await updateProfile(userId, input));
});
