import type { ErrorEnvelope } from "@slj/contracts";
import { ERROR_STATUS } from "@slj/contracts";
import { HTTPException } from "hono/http-exception";
import { AppError, ValidationError } from "../../shared/errors.js";

function toAppError(err: unknown): AppError | undefined {
  if (err instanceof AppError) {
    return err;
  }
  if (err instanceof HTTPException && err.status === 400) {
    return new ValidationError("Request is invalid", {
      issues: [{ path: "", message: err.message }],
    });
  }
  return undefined;
}

export function toErrorResponse(err: unknown, requestId: string): Response {
  const appError = toAppError(err);
  const body: ErrorEnvelope = appError
    ? {
        error: {
          code: appError.code,
          message: appError.message,
          ...(appError.details === undefined ? {} : { details: appError.details }),
          requestId,
        },
      }
    : { error: { code: "INTERNAL", message: "Something went wrong", requestId } };
  const status = appError ? appError.status : ERROR_STATUS.INTERNAL;
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-request-id": requestId },
  });
}
