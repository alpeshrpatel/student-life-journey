/**
 * LocationProvider interface (spec §16).
 * Implementations: GooglePlacesProvider (live) and DemoLocationProvider
 * (clearly-labeled sample data used only when no API key is configured).
 */

export type PlaceCategory =
  | "GROCERY"
  | "PHARMACY"
  | "HEALTHCARE"
  | "TRANSIT"
  | "LAUNDRY";

export const PLACE_CATEGORIES: PlaceCategory[] = [
  "GROCERY",
  "PHARMACY",
  "HEALTHCARE",
  "TRANSIT",
  "LAUNDRY",
];

export interface PlaceResult {
  externalId: string;
  name: string;
  category: PlaceCategory;
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  mapsUrl: string;
  source: "google_places" | "demo";
  openNow?: boolean;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  source: "google" | "builtin";
}

export interface LocationProvider {
  readonly kind: "google_places" | "demo";
  geocode(address: string): Promise<GeocodeResult | null>;
  searchNearby(
    query: { lat: number; lng: number },
    category: PlaceCategory,
    radiusMeters?: number,
  ): Promise<PlaceResult[]>;
}
