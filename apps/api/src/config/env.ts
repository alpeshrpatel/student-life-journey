import { z } from "zod";
import { type Flags, parseFlags } from "./flags.js";

export const EnvironmentSchema = z.enum(["dev", "test", "preview", "production"]);

export interface AppEnv {
  ENVIRONMENT: z.infer<typeof EnvironmentSchema>;
  APP_BASE_URL: string;
  flags: Flags;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  TEST_SUPPORT_TOKEN?: string;
  SENTRY_DSN?: string;
}

const DEV_SECRET = "dev-only-secret-not-for-production-0000";
const MIN_SECRET_LENGTH = 32;

const RawEnvSchema = z.object({
  ENVIRONMENT: EnvironmentSchema,
  APP_BASE_URL: z.string().min(1),
  FLAGS: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  TEST_SUPPORT_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

function nonEmpty(value: string | undefined): string | undefined {
  return value === undefined || value === "" ? undefined : value;
}

/** Validates the Worker bindings once. Throws `Invalid configuration: …` listing every problem. */
export function parseEnv(raw: Record<string, unknown>): AppEnv {
  const problems: string[] = [];
  const parsed = RawEnvSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      problems.push(`${issue.path.join(".") || "env"}: ${issue.message}`);
    }
    throw new Error(`Invalid configuration: ${problems.join("; ")}`);
  }
  const env = parsed.data;
  const hosted = env.ENVIRONMENT === "preview" || env.ENVIRONMENT === "production";

  let flags: Flags | undefined;
  try {
    flags = parseFlags(env.FLAGS ?? "");
  } catch (error) {
    problems.push(error instanceof Error ? error.message : "FLAGS: invalid");
  }

  const googleClientId = nonEmpty(env.GOOGLE_CLIENT_ID);
  const googleClientSecret = nonEmpty(env.GOOGLE_CLIENT_SECRET);
  const testSupportToken = nonEmpty(env.TEST_SUPPORT_TOKEN);
  const sentryDsn = nonEmpty(env.SENTRY_DSN);
  let secret = nonEmpty(env.BETTER_AUTH_SECRET);

  if (hosted) {
    if (secret === undefined || secret.length < MIN_SECRET_LENGTH) {
      problems.push(`BETTER_AUTH_SECRET: must be at least ${MIN_SECRET_LENGTH} characters`);
    }
    if (googleClientId === undefined) {
      problems.push("GOOGLE_CLIENT_ID: required");
    }
    if (googleClientSecret === undefined) {
      problems.push("GOOGLE_CLIENT_SECRET: required");
    }
    if (testSupportToken !== undefined) {
      problems.push("TEST_SUPPORT_TOKEN: must not be set in preview or production");
    }
  } else {
    secret ??= DEV_SECRET;
  }

  if (problems.length > 0 || flags === undefined || secret === undefined) {
    throw new Error(`Invalid configuration: ${problems.join("; ")}`);
  }

  const result: AppEnv = {
    ENVIRONMENT: env.ENVIRONMENT,
    APP_BASE_URL: env.APP_BASE_URL,
    flags,
    BETTER_AUTH_SECRET: secret,
  };
  if (googleClientId !== undefined) result.GOOGLE_CLIENT_ID = googleClientId;
  if (googleClientSecret !== undefined) result.GOOGLE_CLIENT_SECRET = googleClientSecret;
  if (testSupportToken !== undefined) result.TEST_SUPPORT_TOKEN = testSupportToken;
  if (sentryDsn !== undefined) result.SENTRY_DSN = sentryDsn;
  return result;
}
