import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { createDb } from "../src/infra/db/client.js";
import { DrizzleRelocationRepository } from "../src/infra/db/repositories/relocation-repository.js";
import { aRelocationProfile, aUser } from "./helpers/db.js";

function repo() {
  return new DrizzleRelocationRepository(createDb(env.DB));
}

describe("DrizzleRelocationRepository", () => {
  it("AC1: returns null for a user with no profile", async () => {
    const userId = await aUser(env.DB);
    await expect(repo().findByUser(userId)).resolves.toBeNull();
  });

  it("AC2: a second upsert updates the row and keeps createdAt", async () => {
    const userId = await aUser(env.DB);
    const first = await repo().upsert(userId, aRelocationProfile(), 1_000);
    expect(first).toMatchObject({ userId, createdAt: 1_000, updatedAt: 1_000 });

    const second = await repo().upsert(
      userId,
      aRelocationProfile({ destination: "Tempe, USA" }),
      5_000,
    );
    expect(second).toMatchObject({ destination: "Tempe, USA", createdAt: 1_000, updatedAt: 5_000 });

    const read = await repo().findByUser(userId);
    expect(read).toEqual(second);
    const { results } = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM relocation_profile WHERE user_id = ?",
    )
      .bind(userId)
      .all<{ n: number }>();
    expect(results[0]?.n).toBe(1);
  });

  it("AC3: transportPrefs round-trips as an array", async () => {
    const userId = await aUser(env.DB);
    await repo().upsert(
      userId,
      aRelocationProfile({ transportPrefs: ["PUBLIC_TRANSIT", "RIDESHARE"] }),
      1,
    );
    const read = await repo().findByUser(userId);
    expect(read?.transportPrefs).toEqual(["PUBLIC_TRANSIT", "RIDESHARE"]);
  });

  it("AC4: rejects a userId that does not exist (foreign key)", async () => {
    await expect(repo().upsert("no-such-user", aRelocationProfile(), 1)).rejects.toThrow();
    await expect(repo().findByUser("no-such-user")).resolves.toBeNull();
  });

  it("AC5: deleting the user removes the profile", async () => {
    const userId = await aUser(env.DB);
    await repo().upsert(userId, aRelocationProfile(), 1);
    await env.DB.prepare("DELETE FROM user WHERE id = ?").bind(userId).run();
    await expect(repo().findByUser(userId)).resolves.toBeNull();
  });

  it("round-trips every nullable column as null and as a value", async () => {
    const nullUser = await aUser(env.DB);
    const allNull = aRelocationProfile({
      destinationCountryCode: null,
      destinationLat: null,
      destinationLng: null,
      destinationTz: null,
      arrivalTime: null,
      monthlyBudgetMinor: null,
      housingBudgetMinor: null,
      transportPrefs: [],
      homeLabel: null,
      homeLat: null,
      homeLng: null,
      onboardingCompletedAt: null,
    });
    expect(await repo().upsert(nullUser, allNull, 10)).toMatchObject(allNull);

    const fullUser = await aUser(env.DB);
    const full = aRelocationProfile({
      housingStatus: "SECURED",
      homeLabel: "Downtown Phoenix",
      homeLat: 33.45,
      homeLng: -112.07,
      onboardingCompletedAt: 4_200,
    });
    expect(await repo().upsert(fullUser, full, 10)).toMatchObject(full);
  });

  it("only returns the requested user's profile", async () => {
    const a = await aUser(env.DB);
    const b = await aUser(env.DB);
    await repo().upsert(a, aRelocationProfile({ destination: "A-town" }), 1);
    await repo().upsert(b, aRelocationProfile({ destination: "B-town" }), 1);
    expect((await repo().findByUser(a))?.destination).toBe("A-town");
    expect((await repo().findByUser(b))?.destination).toBe("B-town");
  });

  it("upsert is a single database call", async () => {
    const userId = await aUser(env.DB);
    const { countingD1 } = await import("../src/infra/db/counting-d1.js");
    const counting = countingD1(env.DB);
    await new DrizzleRelocationRepository(createDb(counting.d1)).upsert(
      userId,
      aRelocationProfile(),
      1,
    );
    expect(counting.calls()).toBe(1);
  });
});
