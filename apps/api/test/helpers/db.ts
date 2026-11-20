import { expect } from "vitest";

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
