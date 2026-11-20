import { OpenAPIHono } from "@hono/zod-openapi";
import { registerHealthRoutes } from "./http/routes/health.js";

export interface AppBindings {
  Bindings: Env;
  Variables: Record<string, never>;
}

export function buildApp(): OpenAPIHono<AppBindings> {
  const app = new OpenAPIHono<AppBindings>();
  registerHealthRoutes(app);
  return app;
}
