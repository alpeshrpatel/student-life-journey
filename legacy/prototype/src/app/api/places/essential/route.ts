import { ok, withAuth } from "@/shared/http";
import { getEssentialPlaces } from "@/modules/places/places-service";
import { PLACE_CATEGORIES, type PlaceCategory } from "@/tools/maps/location-provider";

export const dynamic = "force-dynamic";

/** GET /api/places/essential?categories=GROCERY,PHARMACY */
export const GET = withAuth(async (req, _ctx, userId) => {
  const url = new URL(req.url);
  const raw = url.searchParams.get("categories");
  let categories: PlaceCategory[] | undefined;
  if (raw) {
    categories = raw
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter((c): c is PlaceCategory =>
        (PLACE_CATEGORIES as string[]).includes(c),
      );
  }
  return ok(await getEssentialPlaces(userId, categories));
});
