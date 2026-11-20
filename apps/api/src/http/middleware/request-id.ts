import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../../app.js";
import { toErrorResponse } from "./error-handler.js";

/** Uses the `cf-ray` header when present, else a random UUID; echoes it as `x-request-id`. */
export const requestId: MiddlewareHandler<AppBindings> = async (c, next) => {
  const id = c.req.header("cf-ray") ?? crypto.randomUUID();
  c.set("requestId", id);
  try {
    await next();
  } catch (err) {
    // Hono only routes `Error` instances to `onError`; anything else lands here.
    c.res = toErrorResponse(err, id);
  }
  c.res.headers.set("x-request-id", id);
};
