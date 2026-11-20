import { ok, withAuth, parseJson } from "@/shared/http";
import {
  completeOnboarding,
  OnboardingSchema,
} from "@/modules/relocation/onboarding-service";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (req, _ctx, userId) => {
  const input = await parseJson(req, OnboardingSchema);
  const profile = await completeOnboarding(userId, input);
  return ok({ success: true, destination: profile.destination });
});
