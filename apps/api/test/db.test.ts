import { env } from "cloudflare:workers";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { countingD1 } from "../src/infra/db/counting-d1.js";
import { applyMigrations, expectDbCalls, migrationStatements } from "./helpers/db.js";
import { req } from "./helpers/request.js";

const productionEnv = {
  ENVIRONMENT: "production",
  BETTER_AUTH_SECRET: "x".repeat(40),
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
};

describe("D1 test database", () => {
  it("AC1: runs SELECT 1 on real D1", async () => {
    const row = await env.DB.prepare("SELECT 1 AS one").first();
    expect(row).toEqual({ one: 1 });
  });

  it("applyMigrations runs an inline two-statement file, ignoring a trailing breakpoint", async () => {
    await applyMigrations(env.DB, {
      "0001_probe.sql":
        "CREATE TABLE migration_probe (id INTEGER PRIMARY KEY);\n--> statement-breakpoint\nINSERT INTO migration_probe (id) VALUES (7);\n--> statement-breakpoint\n",
    });
    const row = await env.DB.prepare("SELECT id FROM migration_probe").first();
    expect(row).toEqual({ id: 7 });
  });

  it("applyMigrations with no files does nothing", async () => {
    await expect(applyMigrations(env.DB, {})).resolves.toBeUndefined();
    expect(migrationStatements({})).toEqual([]);
  });

  it("migrationStatements sorts files by name", () => {
    expect(
      migrationStatements({ "0002_b.sql": "B", "0001_a.sql": "A;\n--> statement-breakpoint\nA2" }),
    ).toEqual(["A;", "A2", "B"]);
  });
});

describe("countingD1", () => {
  it("counts a batch as one call", async () => {
    const counting = countingD1(env.DB);
    await counting.d1.batch([
      counting.d1.prepare("SELECT 1"),
      counting.d1.prepare("SELECT 2"),
      counting.d1.prepare("SELECT 3"),
    ]);
    expect(counting.calls()).toBe(1);
  });

  it("counts two single statements as two calls", async () => {
    const counting = countingD1(env.DB);
    await counting.d1.prepare("SELECT 1").first();
    await counting.d1.prepare("SELECT ?").bind(2).all();
    expect(counting.calls()).toBe(2);
  });

  it("does not count prepare or bind alone", () => {
    const counting = countingD1(env.DB);
    counting.d1.prepare("SELECT ?").bind(1);
    expect(counting.calls()).toBe(0);
  });
});

describe("x-db-calls header", () => {
  it("AC2: one batch of three statements reports 1", async () => {
    const app = buildApp();
    app.get("/__t/batch", async (c) => {
      const { db } = c.var.container;
      await db.batch([db.run(sql`SELECT 1`), db.run(sql`SELECT 2`), db.run(sql`SELECT 3`)]);
      return c.json({ ok: true });
    });
    const res = await req(app, "/__t/batch");
    expect(res.headers.get("x-db-calls")).toBe("1");
    expectDbCalls(res, 1);
  });

  it("is present for a request that touches no database (0 calls)", async () => {
    const res = await req(buildApp(), "/api/v1/health");
    expect(res.headers.get("x-db-calls")).toBe("0");
  });

  it("AC4: is absent in production", async () => {
    const res = await req(buildApp(), "/api/v1/health", undefined, productionEnv);
    expect(res.status).toBe(200);
    expect(res.headers.has("x-db-calls")).toBe(false);
  });

  it("AC4: is absent in preview", async () => {
    const res = await req(buildApp(), "/api/v1/health", undefined, {
      ...productionEnv,
      ENVIRONMENT: "preview",
    });
    expect(res.headers.has("x-db-calls")).toBe(false);
  });
});
