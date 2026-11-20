import type { Container } from "../composition/container.js";

/** Hono environment of the API: Worker bindings and per-request variables. */
export interface AppBindings {
  Bindings: Env;
  Variables: { requestId: string; container: Container };
}
