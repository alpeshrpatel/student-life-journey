import { HealthResponseSchema } from "@slj/contracts";
import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("GET /api/v1/health", () => {
  it("returns ok and matches the contract", async () => {
    const res = await exports.default.fetch("http://example.com/api/v1/health");
    expect(res.status).toBe(200);
    const body = HealthResponseSchema.parse(await res.json());
    expect(body.status).toBe("ok");
  });

  it("unknown route is 404", async () => {
    const res = await exports.default.fetch("http://example.com/api/v1/nope");
    expect(res.status).toBe(404);
  });
});
