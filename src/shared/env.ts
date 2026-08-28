/**
 * Centralized environment access.
 * Empty optional keys gracefully degrade to offline-safe providers
 * (heuristic AI, demo maps) so the MVP always runs end-to-end.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-only-insecure-secret",
  openaiApiKey: process.env.OPENAI_API_KEY?.trim() || "",
  openaiModel: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY?.trim() || "",
};

export const flags = {
  /** Live LLM provider available */
  liveAI: Boolean(env.openaiApiKey),
  /** Live maps/places provider available */
  liveMaps: Boolean(env.googleMapsApiKey),
};
