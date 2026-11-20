import { ConfigResponseSchema } from "@slj/contracts";
import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { parseEnv } from "../src/config/env.js";
import { FLAG_DEFAULTS, parseFlags } from "../src/config/flags.js";

const devEnv = { ENVIRONMENT: "dev", APP_BASE_URL: "http://localhost:5173", FLAGS: "{}" };
const longSecret = "x".repeat(40);
const hostedEnv = {
  ENVIRONMENT: "production",
  APP_BASE_URL: "https://example.com",
  FLAGS: "{}",
  BETTER_AUTH_SECRET: longSecret,
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
};

describe("GET /api/v1/config", () => {
  it("AC1: returns all seven flags with defaults and matches the contract", async () => {
    const res = await exports.default.fetch("http://example.com/api/v1/config");
    expect(res.status).toBe(200);
    const body = ConfigResponseSchema.parse(await res.json());
    expect(body.flags).toEqual(FLAG_DEFAULTS);
    expect(Object.keys(body.flags)).toHaveLength(7);
    expect(body.minClientVersion).toBe("0.0.0");
    expect(body.legal).toEqual({ privacyVersion: "2026-11-beta", termsVersion: "2026-11-beta" });
  });
});

describe("parseFlags", () => {
  it("AC2: an override applies and the other flags keep their defaults", () => {
    const flags = parseFlags('{"signupsOpen":false}');
    expect(flags.signupsOpen).toBe(false);
    expect(flags).toEqual({ ...FLAG_DEFAULTS, signupsOpen: false });
  });

  it("treats an empty string and {} as all defaults", () => {
    expect(parseFlags("")).toEqual(FLAG_DEFAULTS);
    expect(parseFlags("{}")).toEqual(FLAG_DEFAULTS);
  });

  it("AC4: rejects an unknown flag key", () => {
    expect(() => parseFlags('{"nope":true}')).toThrow(/FLAGS/);
  });

  it("rejects malformed JSON and non-boolean values", () => {
    expect(() => parseFlags("{not json")).toThrow(/FLAGS/);
    expect(() => parseFlags('{"aiEnabled":"yes"}')).toThrow(/aiEnabled/);
  });
});

describe("parseEnv", () => {
  it("accepts dev defaults and fills the dev-only secret", () => {
    const env = parseEnv(devEnv);
    expect(env.ENVIRONMENT).toBe("dev");
    expect(env.BETTER_AUTH_SECRET).toBe("dev-only-secret-not-for-production-0000");
    expect(env.flags).toEqual(FLAG_DEFAULTS);
  });

  it("accepts a valid production configuration", () => {
    const env = parseEnv(hostedEnv);
    expect(env.BETTER_AUTH_SECRET).toBe(longSecret);
    expect(env.TEST_SUPPORT_TOKEN).toBeUndefined();
  });

  it("AC3: production with a 10-character secret throws and names the variable", () => {
    expect(() => parseEnv({ ...hostedEnv, BETTER_AUTH_SECRET: "x".repeat(10) })).toThrow(
      /Invalid configuration: .*BETTER_AUTH_SECRET/,
    );
  });

  it("AC3: production with TEST_SUPPORT_TOKEN set throws and names the variable", () => {
    expect(() => parseEnv({ ...hostedEnv, TEST_SUPPORT_TOKEN: "t" })).toThrow(/TEST_SUPPORT_TOKEN/);
    expect(() =>
      parseEnv({ ...hostedEnv, ENVIRONMENT: "preview", TEST_SUPPORT_TOKEN: "t" }),
    ).toThrow(/TEST_SUPPORT_TOKEN/);
  });

  it("requires Google credentials in production and lists every problem", () => {
    expect(() =>
      parseEnv({
        ...hostedEnv,
        BETTER_AUTH_SECRET: "short",
        GOOGLE_CLIENT_ID: undefined,
        GOOGLE_CLIENT_SECRET: undefined,
      }),
    ).toThrow(/BETTER_AUTH_SECRET.*GOOGLE_CLIENT_ID.*GOOGLE_CLIENT_SECRET/);
  });

  it("allows TEST_SUPPORT_TOKEN in test and dev", () => {
    expect(parseEnv({ ...devEnv, ENVIRONMENT: "test", TEST_SUPPORT_TOKEN: "t" })).toMatchObject({
      TEST_SUPPORT_TOKEN: "t",
    });
  });

  it("reports invalid flags and an unknown environment", () => {
    expect(() => parseEnv({ ...devEnv, FLAGS: '{"nope":true}' })).toThrow(/FLAGS/);
    expect(() => parseEnv({ ...devEnv, ENVIRONMENT: "staging" })).toThrow(/ENVIRONMENT/);
  });
});
