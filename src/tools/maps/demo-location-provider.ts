import type {
  GeocodeResult,
  LocationProvider,
  PlaceCategory,
  PlaceResult,
} from "./location-provider";

/**
 * Demo provider — used ONLY when GOOGLE_MAPS_API_KEY is not configured.
 * Every result is explicitly marked `source: "demo"` so the UI can label it
 * as sample data. We never present demo places as verified real results
 * (spec §23).
 */

/** Small built-in coordinate table for geocode fallback (major metros). */
const BUILTIN_CITIES: Record<string, { lat: number; lng: number }> = {
  "new york": { lat: 40.7128, lng: -74.006 },
  "boston": { lat: 42.3601, lng: -71.0589 },
  "chicago": { lat: 41.8781, lng: -87.6298 },
  "austin": { lat: 30.2672, lng: -97.7431 },
  "phoenix": { lat: 33.4484, lng: -112.074 },
  "denver": { lat: 39.7392, lng: -104.9903 },
  "seattle": { lat: 47.6062, lng: -122.3321 },
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  "miami": { lat: 25.7617, lng: -80.1918 },
  "atlanta": { lat: 33.749, lng: -84.388 },
  "toronto": { lat: 43.6532, lng: -79.3832 },
  "vancouver": { lat: 49.2827, lng: -123.1207 },
  "london": { lat: 51.5074, lng: -0.1278 },
  "berlin": { lat: 52.52, lng: 13.405 },
  "paris": { lat: 48.8566, lng: 2.3522 },
  "amsterdam": { lat: 52.3676, lng: 4.9041 },
  "sydney": { lat: -33.8688, lng: 151.2093 },
};

export function builtinGeocode(address: string): GeocodeResult | null {
  const normalized = address.toLowerCase().trim();
  for (const [key, coords] of Object.entries(BUILTIN_CITIES)) {
    if (normalized.includes(key)) {
      return {
        lat: coords.lat,
        lng: coords.lng,
        formattedAddress: address,
        source: "builtin",
      };
    }
  }
  return null;
}

interface DemoTemplate {
  category: PlaceCategory;
  names: string[];
}

const DEMO_TEMPLATES: DemoTemplate[] = [
  { category: "GROCERY", names: ["Central Market", "FreshMart Grocery", "Corner Grocer"] },
  { category: "PHARMACY", names: ["City Pharmacy", "Wellness Drugstore"] },
  { category: "HEALTHCARE", names: ["Downtown Walk-in Clinic", "Community Health Center"] },
  { category: "TRANSIT", names: ["Central Station", "Main St Bus Stop"] },
  { category: "LAUNDRY", names: ["Suds Laundry", "QuickWash Laundromat"] },
];

function offset(base: { lat: number; lng: number }, i: number) {
  const dLat = ((i % 3) + 1) * 0.008;
  const dLng = (Math.floor(i / 3) + 1) * 0.01;
  return { lat: base.lat + dLat, lng: base.lng + dLng };
}

export class DemoLocationProvider implements LocationProvider {
  readonly kind = "demo" as const;

  async geocode(address: string): Promise<GeocodeResult | null> {
    return builtinGeocode(address);
  }

  async searchNearby(
    query: { lat: number; lng: number },
    category: PlaceCategory,
  ): Promise<PlaceResult[]> {
    const template = DEMO_TEMPLATES.find((t) => t.category === category);
    if (!template) return [];
    return template.names.map((name, i) => {
      const pos = offset(query, i);
      return {
        externalId: `demo-${category.toLowerCase()}-${i}`,
        name: `${name} (sample)`,
        category,
        address: `${100 + i * 12} Sample Street`,
        lat: pos.lat,
        lng: pos.lng,
        distanceMeters: Math.round(400 + i * 850),
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${pos.lat},${pos.lng}`,
        source: "demo" as const,
        openNow: undefined,
      };
    });
  }
}
