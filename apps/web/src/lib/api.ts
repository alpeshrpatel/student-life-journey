import { createApiClient } from "@slj/api-client";

export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
  clientVersion: import.meta.env.VITE_APP_VERSION ?? "dev",
});
