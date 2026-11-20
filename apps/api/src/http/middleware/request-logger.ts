import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../../app.js";
import { consoleLogger, type LogLevel, type Logger } from "../../shared/logger.js";

function levelFor(status: number): LogLevel {
  if (status >= 500) return "error";
  if (status === 429) return "warn";
  return "info";
}

/** Writes one line per request: matched route pattern (never the raw URL or query), status, duration. */
export function createRequestLogger(logger: Logger): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const start = Date.now();
    let status = 500;
    try {
      await next();
      status = c.res.status;
    } finally {
      logger.log(levelFor(status), {
        event: "request",
        requestId: c.var.requestId,
        method: c.req.method,
        route: c.req.routePath,
        status,
        durationMs: Date.now() - start,
      });
    }
  };
}

export const requestLogger: MiddlewareHandler<AppBindings> = createRequestLogger(consoleLogger);
