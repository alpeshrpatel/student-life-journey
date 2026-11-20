import type { ErrorCode } from "@slj/contracts";

export type ApiClientErrorCode = ErrorCode | "NETWORK" | "INVALID_RESPONSE";

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiClientErrorCode,
    message: string,
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}
