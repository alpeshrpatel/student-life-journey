import { db } from "@/shared/db";
import { ApiError } from "@/shared/http";
import { getLocationProvider } from "@/tools/maps";
import type {
  PlaceCategory,
  PlaceResult,
} from "@/tools/maps/location-provider";
import { PLACE_CATEGORIES } from "@/tools/maps/location-provider";

/**
 * Essential Places (spec §3.6) — live results via the LocationProvider.
 * Demo-provider results are always tagged `source: "demo"` so the UI can
 * label them honestly as sample data (spec §23).
 */

export interface EssentialPlacesResponse {
  anchorLabel: string;
  source: "google_places" | "demo";
  results: PlaceResult[];
}

async function resolveAnchor(userId: string): Promise<{
  lat: number;
  lng: number;
  label: string;
}> {
  const profile = await db.relocationProfile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError("Complete onboarding first", 409);

  if (profile.homeLat != null && profile.homeLng != null) {
    return { lat: profile.homeLat, lng: profile.homeLng, label: profile.homeAddress ?? "your home" };
  }
  if (profile.destinationLat != null && profile.destinationLng != null) {
    return {
      lat: profile.destinationLat,
      lng: profile.destinationLng,
      label: profile.homeAddress ?? profile.destination,
    };
  }
  const provider = getLocationProvider();
  const geo = await provider.geocode(profile.homeAddress ?? profile.destination);
  if (!geo) {
    throw new ApiError("Could not locate your destination — check it in Settings", 422);
  }
  return { lat: geo.lat, lng: geo.lng, label: profile.homeAddress ?? profile.destination };
}

export async function getEssentialPlaces(
  userId: string,
  categories?: PlaceCategory[],
): Promise<EssentialPlacesResponse> {
  const anchor = await resolveAnchor(userId);
  const provider = getLocationProvider();
  const wanted = categories && categories.length > 0 ? categories : [...PLACE_CATEGORIES];

  const settled = await Promise.allSettled(
    wanted.map((category) => provider.searchNearby(anchor, category, 3000)),
  );

  const results: PlaceResult[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled") results.push(...s.value);
  }

  results.sort((a, b) => a.distanceMeters - b.distanceMeters);

  // Persist for future personalization (best-effort).
  void persistPlaces(userId, results).catch(() => undefined);

  return { anchorLabel: anchor.label, source: provider.kind, results };
}

async function persistPlaces(userId: string, places: PlaceResult[]): Promise<void> {
  await Promise.all(
    places.slice(0, 30).map((p) =>
      db.savedPlace.upsert({
        where: { userId_externalId: { userId, externalId: p.externalId } },
        create: {
          userId,
          externalId: p.externalId,
          name: p.name,
          category: p.category,
          address: p.address,
          lat: p.lat,
          lng: p.lng,
          distanceMeters: p.distanceMeters,
          mapsUrl: p.mapsUrl,
          source: p.source,
        },
        update: { distanceMeters: p.distanceMeters },
      }),
    ),
  );
}
