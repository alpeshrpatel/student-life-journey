import {
  type ConfigResponse,
  ConfigResponseSchema,
  ErrorEnvelopeSchema,
  type HealthResponse,
  HealthResponseSchema,
} from "@slj/contracts";
import type { z } from "zod";
import { ApiClientError } from "./errors.js";

export interface ApiClientOptions {
  /** "" for same origin. */
  baseUrl: string;
  fetch?: typeof fetch;
  getAuthHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  clientVersion: string;
}

export interface RequestOptions<TBody> {
  body?: TBody;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface ApiClient {
  request<TRes>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    schema: z.ZodType<TRes>,
    opts?: RequestOptions<unknown>,
  ): Promise<TRes>;
  health(): Promise<HealthResponse>;
  config(): Promise<ConfigResponse>;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (text === "") {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const doFetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));

  async function request<TRes>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    schema: z.ZodType<TRes>,
    opts: RequestOptions<unknown> = {},
  ): Promise<TRes> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-Client-Version": options.clientVersion,
      ...(options.getAuthHeaders ? await options.getAuthHeaders() : {}),
    };
    if (opts.idempotencyKey !== undefined) {
      headers["Idempotency-Key"] = opts.idempotencyKey;
    }
    const init: RequestInit = { method, headers, credentials: "include" };
    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    if (opts.signal !== undefined) {
      init.signal = opts.signal;
    }

    let res: Response;
    try {
      res = await doFetch(`${options.baseUrl}${path}`, init);
    } catch {
      throw new ApiClientError(0, "NETWORK", "The network request failed");
    }

    const payload = res.status === 204 ? undefined : await readJson(res);

    if (!res.ok) {
      const envelope = ErrorEnvelopeSchema.safeParse(payload);
      if (!envelope.success) {
        throw new ApiClientError(
          res.status,
          "INVALID_RESPONSE",
          "The server sent an unreadable error",
        );
      }
      const { code, message, requestId, details } = envelope.data.error;
      throw new ApiClientError(res.status, code, message, requestId, details);
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiClientError(
        res.status,
        "INVALID_RESPONSE",
        "The server response did not match the contract",
      );
    }
    return parsed.data;
  }

  return {
    request,
    health: () => request("GET", "/api/v1/health", HealthResponseSchema),
    config: () => request("GET", "/api/v1/config", ConfigResponseSchema),
  };
}
