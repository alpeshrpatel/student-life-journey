import { z } from "zod";
import { db } from "@/shared/db";
import { emitDomainEvent, ensureJobsWired } from "@/jobs/events";
import { getLocationProvider } from "@/tools/maps";

/**
 * Relocation onboarding (spec §3.2) — collects only what personalization
 * needs, then emits OnboardingCompleted so the plan job runs.
 */

export const TRANSPORT_OPTIONS = [
  "PUBLIC_TRANSIT",
  "WALKING",
  "BIKE",
  "CAR",
  "RIDESHARE",
] as const;

export const INTEREST_OPTIONS = [
  "FOOD",
  "OUTDOORS",
  "FITNESS",
  "ARTS",
  "NIGHTLIFE",
  "TECH",
  "GAMING",
  "STUDY_SPOTS",
  "MUSIC",
  "SPORTS",
] as const;

export const OnboardingSchema = z.object({
  origin: z.string().min(2).max(120),
  destination: z.string().min(2).max(120),
  arrivalDate: z.coerce.date(),
  arrivalTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  monthlyBudget: z.number().positive().max(100000).nullable(),
  housingStatus: z.enum(["SECURED", "SEARCHING"]),
  housingBudget: z.number().positive().max(100000).nullable(),
  transportation: z.array(z.enum(TRANSPORT_OPTIONS)).default([]),
  interests: z.array(z.string().min(1).max(40)).max(10).default([]),
});
export type OnboardingInput = z.infer<typeof OnboardingSchema>;

async function geocodeDestination(destination: string): Promise<{
  lat: number | null;
  lng: number | null;
}> {
  try {
    const geo = await getLocationProvider().geocode(destination);
    return geo ? { lat: geo.lat, lng: geo.lng } : { lat: null, lng: null };
  } catch {
    return { lat: null, lng: null };
  }
}

export async function completeOnboarding(
  userId: string,
  input: OnboardingInput,
) {
  ensureJobsWired();

  const coords = await geocodeDestination(input.destination);

  const relocation = await db.relocationProfile.upsert({
    where: { userId },
    create: {
      userId,
      origin: input.origin.trim(),
      destination: input.destination.trim(),
      arrivalDate: input.arrivalDate,
      arrivalTime: input.arrivalTime || null,
      monthlyBudget: input.monthlyBudget,
      transportation: input.transportation,
      interests: input.interests.map((i) => i.toUpperCase()),
      destinationLat: coords.lat,
      destinationLng: coords.lng,
      onboardingCompletedAt: new Date(),
    },
    update: {
      origin: input.origin.trim(),
      destination: input.destination.trim(),
      arrivalDate: input.arrivalDate,
      arrivalTime: input.arrivalTime || null,
      monthlyBudget: input.monthlyBudget,
      transportation: input.transportation,
      interests: input.interests.map((i) => i.toUpperCase()),
      ...(coords.lat != null ? { destinationLat: coords.lat } : {}),
      ...(coords.lng != null ? { destinationLng: coords.lng } : {}),
      onboardingCompletedAt: new Date(),
    },
  });

  await db.housingProfile.upsert({
    where: { userId },
    create: {
      userId,
      status: input.housingStatus,
      budget: input.housingStatus === "SEARCHING" ? input.housingBudget : null,
    },
    update: {
      status: input.housingStatus,
      budget: input.housingStatus === "SEARCHING" ? input.housingBudget : null,
    },
  });

  emitDomainEvent({ type: "OnboardingCompleted", userId });
  return relocation;
}

export async function isOnboarded(userId: string): Promise<boolean> {
  const profile = await db.relocationProfile.findUnique({
    where: { userId },
    select: { onboardingCompletedAt: true },
  });
  return Boolean(profile?.onboardingCompletedAt);
}
