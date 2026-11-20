import { OpenAPIHono } from "@hono/zod-openapi";
import { toErrorResponse } from "./http/middleware/error-handler.js";
import { requestId } from "./http/middleware/request-id.js";
import { createRequestLogger } from "./http/middleware/request-logger.js";
import { validationHook } from "./http/openapi-hook.js";
import { registerConfigRoutes } from "./http/routes/config.js";
import { registerHealthRoutes } from "./http/routes/health.js";
import { NotFoundError } from "./shared/errors.js";
import { consoleLogger, type Logger } from "./shared/logger.js";

export interface AppBindings {
  Bindings: Env;
  Variables: { requestId: string };
}

export function buildApp(logger: Logger = consoleLogger): OpenAPIHono<AppBindings> {
  const app = new OpenAPIHono<AppBindings>({ defaultHook: validationHook });
  app.use("*", requestId);
  app.use("*", createRequestLogger(logger));
  app.onError((err, c) => toErrorResponse(err, c.var.requestId));
  app.notFound((c) => toErrorResponse(new NotFoundError("Route"), c.var.requestId));
  registerHealthRoutes(app);
  registerConfigRoutes(app);
  return app;
}
