import { env } from "@/shared/env";
import { haversineMeters } from "@/shared/utils";
import type {
  GeocodeResult,
  LocationProvider,
  PlaceCategory,
  PlaceResult,
} from "./location-provider";

/**
 * Google Maps Places API (New) implementation of LocationProvider.
 * Docs: https://developers.google.com/maps/documentation/places/web-service
 */
interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
}

const CATEGORY_SEARCH_TEXT: Record<PlaceCategory, string> = {
  GROCERY: "grocery store supermarket",
  PHARMACY: "pharmacy drugstore",
  HEALTHCARE: "walk-in clinic medical center",
  TRANSIT: "public transit station metro bus",
  LAUNDRY: "laundromat laundry service",
};

export class GooglePlacesProvider implements LocationProvider {
  readonly kind = "google_places" as const;

  private headers(): HeadersInit {
    return {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.googleMapsApiKey,
    };
  }

  async geocode(address: string): Promise<GeocodeResult | null> {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { ...this.headers(), "X-Goog-FieldMask": "places.id,places.location,places.formattedAddress" },
      body: JSON.stringify({ textQuery: address, maxResultCount: 1 }),
    });
    if (!res.ok) {
      console.error("[google-places] geocode failed:", await res.text());
      return null;
    }
    const data = (await res.json()) as { places?: GooglePlace[] };
    const place = data.places?.[0];
    if (!place?.location?.latitude || !place.location.longitude) return null;
    return {
      lat: place.location.latitude,
      lng: place.location.longitude,
      formattedAddress: place.formattedAddress ?? address,
      source: "google",
    };
  }

  async searchNearby(
    query: { lat: number; lng: number },
    category: PlaceCategory,
    radiusMeters = 3000,
  ): Promise<PlaceResult[]> {
    // Text search anchored to the user's area keeps results relevant per
    // category without requiring a full nearby-types mapping.
    const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: { ...this.headers(), "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location" },
      body: JSON.stringify({
        includedPrimaryTypes: this.primaryTypes(category),
        maxResultCount: 6,
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: {
            center: { latitude: query.lat, longitude: query.lng },
            radius: Math.min(radiusMeters, 50000),
          },
        },
      }),
    });
    if (!res.ok) {
      console.error("[google-places] searchNearby failed:", await res.text());
      return [];
    }
    const data = (await res.json()) as { places?: GooglePlace[] };

    // Fallback: if the strict type filter returned nothing, try a text query.
    let places = data.places ?? [];
    if (places.length === 0) {
      const textRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: { ...this.headers(), "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location" },
        body: JSON.stringify({
          textQuery: CATEGORY_SEARCH_TEXT[category],
          maxResultCount: 6,
          locationBias: {
            circle: {
              center: { latitude: query.lat, longitude: query.lng },
              radius: radiusMeters,
            },
          },
        }),
      });
      if (textRes.ok) {
        const textData = (await textRes.json()) as { places?: GooglePlace[] };
        places = textData.places ?? [];
      }
    }

    return places
      .map((p): PlaceResult | null => {
        if (!p.location?.latitude || !p.location.longitude || !p.displayName?.text) return null;
        const distanceMeters = haversineMeters(
          query.lat,
          query.lng,
          p.location.latitude,
          p.location.longitude,
        );
        return {
          externalId: p.id,
          name: p.displayName.text,
          category,
          address: p.formattedAddress ?? "",
          lat: p.location.latitude,
          lng: p.location.longitude,
          distanceMeters: Math.round(distanceMeters),
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${p.id}`,
          source: "google_places",
        };
      })
      .filter((p): p is PlaceResult => p !== null)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  private primaryTypes(category: PlaceCategory): string[] {
    switch (category) {
      case "GROCERY":
        return ["supermarket", "grocery_store"];
      case "PHARMACY":
        return ["pharmacy", "drugstore"];
      case "HEALTHCARE":
        return ["medical_clinic", "hospital", "doctor"];
      case "TRANSIT":
        return ["transit_station", "subway_station", "bus_station", "train_station"];
      case "LAUNDRY":
        return ["laundry", "laundromat"];
    }
  }
}
