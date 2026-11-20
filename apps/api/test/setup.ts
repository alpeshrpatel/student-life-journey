import { env } from "cloudflare:workers";
import { beforeAll } from "vitest";
import { applyMigrations } from "./helpers/db.js";

beforeAll(async () => {
  await applyMigrations(env.DB);
});
