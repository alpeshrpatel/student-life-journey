import { flags } from "@/shared/env";
import { builtinGeocode } from "./demo-location-provider";
import type { LocationProvider } from "./location-provider";

/**
 * Provider selection is centralized — agents never import concrete providers.
 */
let cached: LocationProvider | null = null;

export function getLocationProvider(): LocationProvider {
  if (!cached) {
    cached = flags.liveMaps ? newGoogleProvider() : newDemoProvider();
  }
  return cached;
}

// Lazy requires keep the Google provider out of the bundle when unused.
function newGoogleProvider(): LocationProvider {
  const { GooglePlacesProvider } =
    require("./google-places-provider") as typeof import("./google-places-provider");
  return new GooglePlacesProvider();
}

function newDemoProvider(): LocationProvider {
  const { DemoLocationProvider } =
    require("./demo-location-provider") as typeof import("./demo-location-provider");
  return new DemoLocationProvider();
}

export function quickGeocode(address: string) {
  return builtinGeocode(address);
}
