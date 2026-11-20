import { describe, expect, it } from "vitest";
import { req } from "./helpers/request.js";
import { buildApp } from "../src/app.js";
import { createLogger, type Logger } from "../src/shared/logger.js";

function capture(minLevel: Parameters<typeof createLogger>[1] = "debug") {
  const lines: Record<string, unknown>[] = [];
  const logger: Logger = createLogger((line) => {
    lines.push(JSON.parse(line) as Record<string, unknown>);
  }, minLevel);
  return { lines, logger };
}

describe("createLogger", () => {
  it("AC2: drops forbidden keys and marks the line redacted", () => {
    const { lines, logger } = capture();
    logger.log("info", { event: "x", email: "a@b.c" });
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toHaveProperty("email");
    expect(lines[0]).toMatchObject({ level: "info", event: "x", redacted: true });
  });

  it("drops every forbidden key, whatever its case", () => {
    const { lines, logger } = capture();
    logger.log("info", {
      event: "x",
      body: "b",
      Email: "e",
      name: "n",
      token: "t",
      Authorization: "a",
      cookie: "c",
      message: "m",
      prompt: "p",
      keep: "yes",
    });
    expect(Object.keys(lines[0] ?? {}).sort()).toEqual(["event", "keep", "level", "redacted"]);
  });

  it("does not add redacted when nothing was dropped", () => {
    const { lines, logger } = capture();
    logger.log("info", { event: "x" });
    expect(lines[0]).not.toHaveProperty("redacted");
  });

  it("skips lines below the minimum level", () => {
    const { lines, logger } = capture("warn");
    logger.log("debug", { event: "a" });
    logger.log("info", { event: "b" });
    logger.log("warn", { event: "c" });
    logger.log("error", { event: "d" });
    expect(lines.map((l) => l.event)).toEqual(["c", "d"]);
  });
});

describe("request logger", () => {
  it("AC1: writes exactly one request line with status and a numeric duration", async () => {
    const { lines, logger } = capture();
    const res = await req(buildApp(logger), "/api/v1/health?secret=1", {
      headers: { "cf-ray": "ray-1" },
    });
    expect(res.status).toBe(200);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: "info",
      event: "request",
      requestId: "ray-1",
      method: "GET",
      route: "/api/v1/health",
      status: 200,
    });
    expect(typeof lines[0]?.durationMs).toBe("number");
    expect(JSON.stringify(lines[0])).not.toContain("secret");
  });

  it("AC3: a 500 is logged at level error with the final status", async () => {
    const { lines, logger } = capture();
    const app = buildApp(logger);
    app.get("/__t/boom", () => {
      throw new Error("x");
    });
    const res = await req(app, "/__t/boom");
    expect(res.status).toBe(500);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ level: "error", status: 500, route: "/__t/boom" });
  });

  it("logs a 429 at level warn and a 404 at info", async () => {
    const { lines, logger } = capture();
    const app = buildApp(logger);
    app.get("/__t/limited", (c) => c.json({}, 429));
    await req(app, "/__t/limited");
    await req(app, "/nope");
    expect(lines.map((l) => [l.status, l.level])).toEqual([
      [429, "warn"],
      [404, "info"],
    ]);
  });
});
