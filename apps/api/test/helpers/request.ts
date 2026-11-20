import { env } from "cloudflare:workers";
import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings } from "../../src/http/bindings.js";

const executionContext = {
  waitUntil: (): void => undefined,
  passThroughOnException: (): void => undefined,
  props: {},
};

/** Calls the app in-process with the Worker bindings (and optional overrides) and a stub context. */
export function req(
  app: OpenAPIHono<AppBindings>,
  path: string,
  init?: RequestInit,
  envOverrides: Partial<Record<string, unknown>> = {},
): Promise<Response> | Response {
  return app.request(path, init, { ...env, ...envOverrides }, executionContext);
}
