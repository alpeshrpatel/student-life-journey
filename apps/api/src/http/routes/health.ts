import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import { HealthResponseSchema } from "@slj/contracts";
import pkg from "../../../package.json";
import type { AppBindings } from "../bindings.js";

const healthRoute = createRoute({
  method: "get",
  path: "/api/v1/health",
  responses: {
    200: {
      content: { "application/json": { schema: HealthResponseSchema } },
      description: "ok",
    },
  },
});

export function registerHealthRoutes(app: OpenAPIHono<AppBindings>): void {
  app.openapi(healthRoute, (c) =>
    c.json({ status: "ok" as const, version: pkg.version, time: new Date().toISOString() }, 200),
  );
}
