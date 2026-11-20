import type { Hook } from "@hono/zod-openapi";
import type { AppBindings } from "./bindings.js";
import { ValidationError } from "../shared/errors.js";

/** On a Zod failure, throws a `ValidationError` carrying `{ issues: { path, message }[] }`. */
export const validationHook: Hook<unknown, AppBindings, string, void> = (result) => {
  if (!result.success) {
    throw new ValidationError("Request is invalid", {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
};
