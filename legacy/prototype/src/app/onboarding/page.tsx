import { requirePageUser } from "@/shared/auth/session";
import { isOnboarded } from "@/modules/relocation/onboarding-service";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "./wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const userId = await requirePageUser();
  if (await isOnboarded(userId)) redirect("/dashboard");
  return <OnboardingWizard />;
}
