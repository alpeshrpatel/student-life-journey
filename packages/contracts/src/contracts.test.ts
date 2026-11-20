import { describe, expect, it } from "vitest";
import { MoneySchema } from "./common.js";
import { ERROR_STATUS, ErrorCodeSchema, ErrorEnvelopeSchema } from "./errors.js";
import { HealthResponseSchema } from "./health.js";

describe("contract examples", () => {
  it("AC1: parses the health example", () => {
    const parsed = HealthResponseSchema.safeParse({
      status: "ok",
      version: "0.1.0",
      time: "2026-11-14T09:30:00.000Z",
    });
    expect(parsed.success).toBe(true);
  });

  it("AC1: parses the failure envelope example", () => {
    const parsed = ErrorEnvelopeSchema.safeParse({
      error: { code: "NOT_FOUND", message: "Task not found", requestId: "b0c1" },
    });
    expect(parsed.success).toBe(true);
  });
});

describe("ERROR_STATUS", () => {
  it("AC2: has an HTTP status for every error code", () => {
    for (const code of ErrorCodeSchema.options) {
      expect(ERROR_STATUS[code]).toBeGreaterThanOrEqual(400);
    }
    expect(Object.keys(ERROR_STATUS)).toHaveLength(ErrorCodeSchema.options.length);
  });
});

describe("rejections", () => {
  it("AC3: rejects an unknown error code", () => {
    const parsed = ErrorEnvelopeSchema.safeParse({
      error: { code: "NOPE", message: "x", requestId: "1" },
    });
    expect(parsed.success).toBe(false);
  });

  it("AC3: rejects a fractional money amount", () => {
    expect(MoneySchema.safeParse({ amountMinor: 1.5, currency: "USD" }).success).toBe(false);
  });

  it("accepts any JSON in details", () => {
    const parsed = ErrorEnvelopeSchema.safeParse({
      error: { code: "VALIDATION_FAILED", message: "x", details: { field: ["a"] }, requestId: "1" },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a health response whose status is not ok", () => {
    const parsed = HealthResponseSchema.safeParse({
      status: "down",
      version: "0.1.0",
      time: "2026-11-14T09:30:00.000Z",
    });
    expect(parsed.success).toBe(false);
  });
});
