import { z } from "zod";
import { db } from "@/shared/db";
import { emitDomainEvent } from "@/jobs/events";
import { getLocationProvider } from "@/tools/maps";
import { TRANSPORT_OPTIONS } from "@/modules/relocation/onboarding-service";

/** Profile management (Settings screen) + context-change event emission. */

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  origin: z.string().min(2).max(120).optional(),
  destination: z.string().min(2).max(120).optional(),
  arrivalDate: z.coerce.date().optional(),
  arrivalTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  monthlyBudget: z.number().positive().max(100000).nullable().optional(),
  housingStatus: z.enum(["SECURED", "SEARCHING"]).optional(),
  housingBudget: z.number().positive().max(100000).nullable().optional(),
  housingAddress: z.string().max(200).nullable().optional(),
  homeAddress: z.string().max(200).nullable().optional(),
  transportation: z.array(z.enum(TRANSPORT_OPTIONS)).optional(),
  interests: z.array(z.string().min(1).max(40)).max(10).optional(),
});

export async function getProfile(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { relocationProfile: true, housingProfile: true },
    select: {
      id: true,
      email: true,
      name: true,
      relocationProfile: true,
      housingProfile: true,
    },
  });
  if (!user) throw new Error("User not found");
  return user;
}

export async function updateProfile(
  userId: string,
  input: z.infer<typeof UpdateProfileSchema>,
) {
  const before = await getProfile(userId);
  const rp = before.relocationProfile;
  const hp = before.housingProfile;

  await db.user.update({
    where: { id: userId },
    data: { ...(input.name !== undefined ? { name: input.name.trim() } : {}) },
  });

  const arrivalChanged =
    input.arrivalDate != null &&
    rp?.arrivalDate &&
    new Date(input.arrivalDate).getTime() !== rp.arrivalDate.getTime();

  const destinationChanged =
    input.destination != null && rp && input.destination.trim() !== rp.destination;

  if (rp) {
    // Re-geocode when destination or home address changes.
    const geo =
      destinationChanged || (input.homeAddress != null)
        ? await getLocationProvider()
            .geocode(input.destination ?? rp.destination)
            .catch(() => null)
        : null;

    await db.relocationProfile.update({
      where: { userId },
      data: {
        ...(input.origin ? { origin: input.origin.trim() } : {}),
        ...(input.destination ? { destination: input.destination.trim() } : {}),
        ...(input.arrivalDate ? { arrivalDate: input.arrivalDate } : {}),
        ...(input.arrivalTime !== undefined
          ? { arrivalTime: input.arrivalTime || null }
          : {}),
        ...(input.monthlyBudget !== undefined
          ? { monthlyBudget: input.monthlyBudget }
          : {}),
        ...(input.homeAddress !== undefined
          ? { homeAddress: input.homeAddress || null }
          : {}),
        ...(input.transportation ? { transportation: input.transportation } : {}),
        ...(input.interests
          ? { interests: input.interests.map((i) => i.toUpperCase()) }
          : {}),
        ...(geo ? { destinationLat: geo.lat, destinationLng: geo.lng } : {}),
      },
    });
  }

  if (hp) {
    const securedNow =
      input.housingStatus === "SECURED" && hp.status === "SEARCHING";
    await db.housingProfile.update({
      where: { userId },
      data: {
        ...(input.housingStatus ? { status: input.housingStatus } : {}),
        ...(input.housingBudget !== undefined
          ? {
              budget:
                (input.housingStatus ?? hp.status) === "SEARCHING"
                  ? input.housingBudget
                  : null,
            }
          : {}),
        ...(input.housingAddress !== undefined
          ? { address: input.housingAddress || null }
          : {}),
      },
    });

    if (securedNow) emitDomainEvent({ type: "HousingSecured", userId });
    else if (input.housingStatus) {
      emitDomainEvent({
        type: "HousingStatusChanged",
        userId,
        status: input.housingStatus,
      });
    }
  }

  if (arrivalChanged) emitDomainEvent({ type: "ArrivalDateChanged", userId });

  return getProfile(userId);
}
