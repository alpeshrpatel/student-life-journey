import { expect } from "vitest";
import type { RelocationProfileInput } from "../../src/modules/relocation/ports.js";

const migrationFiles = import.meta.glob<string>("../../migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
});

const BREAKPOINT = "--> statement-breakpoint";

export function migrationStatements(files: Record<string, string>): string[] {
  return Object.keys(files)
    .sort()
    .flatMap((name) => (files[name] ?? "").split(BREAKPOINT))
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

/** Applies every migration in `apps/api/migrations` with a single `batch()` call. */
export async function applyMigrations(
  d1: D1Database,
  files: Record<string, string> = migrationFiles,
): Promise<void> {
  const statements = migrationStatements(files);
  if (statements.length === 0) {
    return;
  }
  await d1.batch(statements.map((statement) => d1.prepare(statement)));
}

/** Asserts the response reports at most `max` database round trips (`x-db-calls`). */
export function expectDbCalls(res: Response, max: number): void {
  const header = res.headers.get("x-db-calls");
  expect(header).not.toBeNull();
  expect(Number(header)).toBeLessThanOrEqual(max);
}

/** Inserts a `user` row directly and returns its id. */
export async function aUser(d1: D1Database, overrides: { email?: string } = {}): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();
  await d1
    .prepare(
      "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)",
    )
    .bind(id, "Test User", overrides.email ?? `${id}@example.com`, now, now)
    .run();
  return id;
}

/** A complete, valid relocation profile input; override any field. */
export function aRelocationProfile(
  overrides: Partial<RelocationProfileInput> = {},
): RelocationProfileInput {
  return {
    origin: "Pune, India",
    destination: "Phoenix, USA",
    destinationCountryCode: "US",
    destinationLat: 33.4484,
    destinationLng: -112.074,
    destinationTz: "America/Phoenix",
    arrivalDate: "2026-12-01",
    arrivalTime: "14:30",
    monthlyBudgetMinor: 250_000,
    housingStatus: "SEARCHING",
    housingBudgetMinor: 120_000,
    transportPrefs: ["PUBLIC_TRANSIT"],
    homeLabel: null,
    homeLat: null,
    homeLng: null,
    onboardingCompletedAt: null,
    ...overrides,
  };
}
