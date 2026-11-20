import { requirePageUser } from "@/shared/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/shared/db";
import { AppShell } from "./app-shell";

export const dynamic = "force-dynamic";

export default async function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const userId = await requirePageUser();

  const profile = await db.relocationProfile.findUnique({
    where: { userId },
    select: {
      onboardingCompletedAt: true,
      destination: true,
    },
  });
  const housing = await db.housingProfile.findUnique({
    where: { userId },
    select: { status: true },
  });

  if (!profile?.onboardingCompletedAt) redirect("/onboarding");

  return (
    <AppShell
      destination={profile.destination}
      housingStatus={housing?.status ?? "SEARCHING"}
    >
      {children}
    </AppShell>
  );
}
