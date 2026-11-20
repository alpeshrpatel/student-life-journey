import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import { ConfigResponseSchema } from "@slj/contracts";
import type { AppBindings } from "../bindings.js";
import { parseEnv } from "../../config/env.js";

const configRoute = createRoute({
  method: "get",
  path: "/api/v1/config",
  responses: {
    200: {
      content: { "application/json": { schema: ConfigResponseSchema } },
      description: "Public configuration: flags, minimum client version, legal versions",
    },
  },
});

export function registerConfigRoutes(app: OpenAPIHono<AppBindings>): void {
  app.openapi(configRoute, (c) => {
    const env = parseEnv({ ...c.env });
    return c.json(
      {
        flags: env.flags,
        minClientVersion: "0.0.0",
        legal: { privacyVersion: "2026-11-beta", termsVersion: "2026-11-beta" },
      },
      200,
    );
  });
}
