import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const NOW = 1_700_000_000_000;
let counter = 0;
const unique = (prefix: string): string => `${prefix}-${String(++counter)}`;

async function insertUser(id: string, email: string): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)",
  )
    .bind(id, "Test", email, NOW, NOW)
    .run();
}

async function insertSession(id: string, token: string, userId: string): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO session (id, token, user_id, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(id, token, userId, NOW + 1000, NOW, NOW)
    .run();
}

async function columns(table: string): Promise<string[]> {
  const { results } = await env.DB.prepare(`SELECT name FROM pragma_table_info('${table}')`).all<{
    name: string;
  }>();
  return results.map((row) => row.name);
}

describe("Better Auth schema migration", () => {
  it("AC1: creates user, session, account and verification", async () => {
    const { results } = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('user','session','account','verification')",
    ).all<{ name: string }>();
    expect(results.map((r) => r.name).sort()).toEqual([
      "account",
      "session",
      "user",
      "verification",
    ]);
  });

  it("has the columns the auth layer relies on", async () => {
    expect(await columns("user")).toEqual(
      expect.arrayContaining([
        "id",
        "name",
        "email",
        "email_verified",
        "image",
        "created_at",
        "updated_at",
      ]),
    );
    expect(await columns("session")).toEqual(
      expect.arrayContaining(["id", "token", "user_id", "expires_at", "ip_address", "user_agent"]),
    );
    expect(await columns("account")).toEqual(
      expect.arrayContaining([
        "id",
        "account_id",
        "provider_id",
        "user_id",
        "access_token",
        "refresh_token",
      ]),
    );
    expect(await columns("verification")).toEqual(
      expect.arrayContaining(["id", "identifier", "value", "expires_at"]),
    );
  });

  it("AC2: rejects a second user with the same email", async () => {
    const email = `${unique("same")}@example.com`;
    await insertUser(unique("u"), email);
    await expect(insertUser(unique("u"), email)).rejects.toThrow(/UNIQUE/i);
  });

  it("rejects a second session with the same token", async () => {
    const userId = unique("u");
    const token = unique("tok");
    await insertUser(userId, `${userId}@example.com`);
    await insertSession(unique("s"), token, userId);
    await expect(insertSession(unique("s"), token, userId)).rejects.toThrow(/UNIQUE/i);
  });

  it("AC3: rejects a session whose user does not exist", async () => {
    await expect(insertSession(unique("s"), unique("tok"), "missing-user")).rejects.toThrow(
      /FOREIGN KEY/i,
    );
  });

  it("AC4: deleting a user removes their sessions", async () => {
    const userId = unique("u");
    await insertUser(userId, `${userId}@example.com`);
    await insertSession(unique("s"), unique("tok"), userId);
    await insertSession(unique("s"), unique("tok"), userId);
    const before = await env.DB.prepare("SELECT id FROM session WHERE user_id = ?")
      .bind(userId)
      .all();
    expect(before.results).toHaveLength(2);
    await env.DB.prepare("DELETE FROM user WHERE id = ?").bind(userId).run();
    const after = await env.DB.prepare("SELECT id FROM session WHERE user_id = ?")
      .bind(userId)
      .all();
    expect(after.results).toEqual([]);
  });
});
