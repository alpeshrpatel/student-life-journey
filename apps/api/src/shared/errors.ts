import { ERROR_STATUS, type ErrorCode } from "@slj/contracts";

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }

  get status(): number {
    return ERROR_STATUS[this.code];
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_FAILED", message, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Sign in required") {
    super("UNAUTHENTICATED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this") {
    super("FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  constructor(what: string) {
    super("NOT_FOUND", `${what} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message);
  }
}

export class OnboardingRequiredError extends AppError {
  constructor() {
    super("ONBOARDING_REQUIRED", "Finish onboarding first");
  }
}

export class RateLimitedError extends AppError {
  constructor(limit: string, resetsAt: string) {
    super("RATE_LIMITED", "Too many requests", { limit, resetsAt });
  }
}

export class UpstreamUnavailableError extends AppError {
  constructor(what: string) {
    super("UPSTREAM_UNAVAILABLE", `${what} is unavailable`);
  }
}
