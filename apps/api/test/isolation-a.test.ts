import { env } from "cloudflare:workers";
import { expect, it } from "vitest";

it("AC3: sees only its own rows (file A)", async () => {
  await env.DB.exec("CREATE TABLE IF NOT EXISTS isolation_probe (owner TEXT)");
  await env.DB.prepare("INSERT INTO isolation_probe (owner) VALUES (?)").bind("a").run();
  const { results } = await env.DB.prepare("SELECT owner FROM isolation_probe").all();
  expect(results).toEqual([{ owner: "a" }]);
});
