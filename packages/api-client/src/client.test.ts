import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createApiClient } from "./client.js";
import { ApiClientError } from "./errors.js";

const health = { status: "ok", version: "0.1.0", time: "2026-11-14T09:30:00.000Z" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function clientWith(
  fetchImpl: typeof fetch,
  extra: Partial<Parameters<typeof createApiClient>[0]> = {},
) {
  return createApiClient({
    baseUrl: "https://api.test",
    clientVersion: "1.2.3",
    fetch: fetchImpl,
    ...extra,
  });
}

function lastCall(spy: ReturnType<typeof vi.fn>) {
  const [url, init] = spy.mock.calls.at(-1) as [string, RequestInit];
  return { url, init, headers: init.headers as Record<string, string> };
}

describe("createApiClient", () => {
  it("AC1: health() resolves with the parsed body and sends X-Client-Version", async () => {
    const spy = vi.fn(() => Promise.resolve(jsonResponse(health)));
    const result = await clientWith(spy).health();
    expect(result).toEqual(health);
    const { url, init, headers } = lastCall(spy);
    expect(url).toBe("https://api.test/api/v1/health");
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
    expect(headers["X-Client-Version"]).toBe("1.2.3");
    expect(headers.Accept).toBe("application/json");
  });

  it("config() parses the config contract", async () => {
    const body = {
      flags: { aiEnabled: true },
      minClientVersion: "0.0.0",
      legal: { privacyVersion: "p", termsVersion: "t" },
    };
    const fetchImpl = (() => Promise.resolve(jsonResponse(body))) as typeof fetch;
    await expect(clientWith(fetchImpl).config()).resolves.toEqual(body);
  });

  it("AC2: a 404 envelope becomes an ApiClientError with the code and requestId", async () => {
    const envelope = { error: { code: "NOT_FOUND", message: "Task not found", requestId: "b0c1" } };
    const fetchImpl = (() => Promise.resolve(jsonResponse(envelope, 404))) as typeof fetch;
    const error = await clientWith(fetchImpl)
      .health()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      status: 404,
      code: "NOT_FOUND",
      message: "Task not found",
      requestId: "b0c1",
    });
  });

  it("keeps the details of a validation error", async () => {
    const envelope = {
      error: {
        code: "VALIDATION_FAILED",
        message: "Request is invalid",
        details: { issues: [] },
        requestId: "r",
      },
    };
    const fetchImpl = (() => Promise.resolve(jsonResponse(envelope, 422))) as typeof fetch;
    const error = (await clientWith(fetchImpl)
      .health()
      .catch((e: unknown) => e)) as ApiClientError;
    expect(error.details).toEqual({ issues: [] });
  });

  it("an unreadable error body is INVALID_RESPONSE with the HTTP status", async () => {
    const fetchImpl = (() =>
      Promise.resolve(new Response("<html>bad gateway</html>", { status: 502 }))) as typeof fetch;
    const error = await clientWith(fetchImpl)
      .health()
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 502, code: "INVALID_RESPONSE" });
  });

  it("AC3: a thrown fetch becomes NETWORK with status 0", async () => {
    const fetchImpl = (() => Promise.reject(new TypeError("Failed to fetch"))) as typeof fetch;
    const error = await clientWith(fetchImpl)
      .health()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ status: 0, code: "NETWORK" });
  });

  it("AC4: a 200 body that does not match the schema is INVALID_RESPONSE", async () => {
    const fetchImpl = (() => Promise.resolve(jsonResponse({ status: "down" }))) as typeof fetch;
    const error = await clientWith(fetchImpl)
      .health()
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 200, code: "INVALID_RESPONSE" });
  });

  it("sends the Idempotency-Key and a JSON body when given", async () => {
    const spy = vi.fn(() => Promise.resolve(jsonResponse({ ok: true })));
    await clientWith(spy as unknown as typeof fetch).request(
      "POST",
      "/api/v1/things",
      z.object({ ok: z.boolean() }),
      {
        body: { a: 1 },
        idempotencyKey: "key-1",
      },
    );
    const { init, headers } = lastCall(spy);
    expect(headers["Idempotency-Key"]).toBe("key-1");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe('{"a":1}');
  });

  it("does not send an Idempotency-Key or body by default", async () => {
    const spy = vi.fn(() => Promise.resolve(jsonResponse(health)));
    await clientWith(spy).health();
    const { init, headers } = lastCall(spy);
    expect(headers).not.toHaveProperty("Idempotency-Key");
    expect(init.body).toBeUndefined();
  });

  it("merges auth headers from a sync or async provider", async () => {
    const spy = vi.fn(() => Promise.resolve(jsonResponse(health)));
    await clientWith(spy, {
      getAuthHeaders: () => Promise.resolve({ Authorization: "Bearer t" }),
    }).health();
    expect(lastCall(spy).headers.Authorization).toBe("Bearer t");
  });

  it("returns undefined for a 204 when the schema is z.void()", async () => {
    const fetchImpl = (() => Promise.resolve(new Response(null, { status: 204 }))) as typeof fetch;
    await expect(
      clientWith(fetchImpl).request("DELETE", "/api/v1/things/1", z.void()),
    ).resolves.toBeUndefined();
  });

  it("passes the abort signal to fetch", async () => {
    const spy = vi.fn(() => Promise.resolve(jsonResponse(health)));
    const controller = new AbortController();
    await clientWith(spy as unknown as typeof fetch).request("GET", "/x", z.unknown(), {
      signal: controller.signal,
    });
    expect(lastCall(spy).init.signal).toBe(controller.signal);
  });
});
