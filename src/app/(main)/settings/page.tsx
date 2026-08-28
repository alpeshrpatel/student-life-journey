import { requirePageUser } from "@/shared/auth/session";
import { getProfile } from "@/modules/users/profile-service";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await requirePageUser();
  const profile = await getProfile(userId);

  return (
    <SettingsForm
      email={profile.email}
      name={profile.name}
      relocation={
        profile.relocationProfile
          ? {
              origin: profile.relocationProfile.origin,
              destination: profile.relocationProfile.destination,
              arrivalDate: profile.relocationProfile.arrivalDate
                .toISOString()
                .slice(0, 10),
              arrivalTime: profile.relocationProfile.arrivalTime ?? "",
              monthlyBudget: profile.relocationProfile.monthlyBudget?.toString() ?? "",
              homeAddress: profile.relocationProfile.homeAddress ?? "",
              transportation: profile.relocationProfile.transportation,
              interests: profile.relocationProfile.interests,
            }
          : null
      }
      housing={
        profile.housingProfile
          ? {
              status: profile.housingProfile.status,
              budget: profile.housingProfile.budget?.toString() ?? "",
            }
          : null
      }
    />
  );
}
