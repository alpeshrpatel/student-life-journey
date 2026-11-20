import { createRoute, z } from "@hono/zod-openapi";
import { ERROR_STATUS, ErrorEnvelopeSchema, type ErrorCode } from "@slj/contracts";
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import {
  type AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  OnboardingRequiredError,
  RateLimitedError,
  UnauthenticatedError,
  UpstreamUnavailableError,
  ValidationError,
} from "../src/shared/errors.js";

function testApp() {
  const app = buildApp();
  app.get("/__t/not-found", () => {
    throw new NotFoundError("Task");
  });
  app.get("/__t/boom", () => {
    throw new Error("secret detail");
  });
  app.get("/__t/string-thrown", () => {
    const thrown: unknown = "secret detail";
    throw thrown;
  });
  app.openapi(
    createRoute({
      method: "post",
      path: "/__t/validate",
      request: {
        body: {
          content: { "application/json": { schema: z.object({ arrivalDate: z.string() }) } },
        },
      },
      responses: { 200: { description: "ok" } },
    }),
    (c) => c.json({ ok: true }, 200),
  );
  return app;
}

describe("error envelope", () => {
  it("AC1: NotFoundError becomes a 404 envelope whose requestId matches x-request-id", async () => {
    const res = await testApp().request("/__t/not-found");
    expect(res.status).toBe(404);
    const body = ErrorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Task not found");
    expect(body.error.requestId).toBe(res.headers.get("x-request-id"));
  });

  it("AC2: an unexpected error is a generic 500 that leaks nothing", async () => {
    const res = await testApp().request("/__t/boom");
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("secret detail");
    expect(ErrorEnvelopeSchema.parse(JSON.parse(text)).error).toMatchObject({
      code: "INTERNAL",
      message: "Something went wrong",
    });
  });

  it("handles non-Error thrown values without leaking them", async () => {
    const res = await testApp().request("/__t/string-thrown");
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("secret detail");
  });

  it("AC3: an unknown path returns a NOT_FOUND envelope", async () => {
    const res = await testApp().request("/api/v1/nope");
    expect(res.status).toBe(404);
    expect(ErrorEnvelopeSchema.parse(await res.json()).error.code).toBe("NOT_FOUND");
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("AC4: an invalid body is a 422 naming the field", async () => {
    const res = await testApp().request("/__t/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ arrivalDate: 5 }),
    });
    expect(res.status).toBe(422);
    const body = ErrorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(body.error.details).toMatchObject({
      issues: [{ path: "arrivalDate", message: expect.any(String) as string }],
    });
  });

  it("a malformed JSON body is VALIDATION_FAILED", async () => {
    const res = await testApp().request("/__t/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(422);
    expect(ErrorEnvelopeSchema.parse(await res.json()).error.code).toBe("VALIDATION_FAILED");
  });

  it("uses cf-ray as the request id when present", async () => {
    const res = await testApp().request("/__t/not-found", { headers: { "cf-ray": "ray-123" } });
    expect(res.headers.get("x-request-id")).toBe("ray-123");
  });
});

describe("AppError subclasses", () => {
  it("map to the status in ERROR_STATUS", () => {
    const cases: [AppError, ErrorCode][] = [
      [new ValidationError("x"), "VALIDATION_FAILED"],
      [new UnauthenticatedError(), "UNAUTHENTICATED"],
      [new ForbiddenError(), "FORBIDDEN"],
      [new NotFoundError("Thing"), "NOT_FOUND"],
      [new ConflictError("x"), "CONFLICT"],
      [new OnboardingRequiredError(), "ONBOARDING_REQUIRED"],
      [new RateLimitedError("10/min", "2026-11-20T00:00:00.000Z"), "RATE_LIMITED"],
      [new UpstreamUnavailableError("Places"), "UPSTREAM_UNAVAILABLE"],
    ];
    for (const [error, code] of cases) {
      expect(error.code).toBe(code);
      expect(error.status).toBe(ERROR_STATUS[code]);
    }
    expect(new RateLimitedError("10/min", "t").details).toEqual({ limit: "10/min", resetsAt: "t" });
  });
});
