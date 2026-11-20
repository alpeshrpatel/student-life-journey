import { eq } from "drizzle-orm";
import type {
  RelocationProfile,
  RelocationProfileInput,
  RelocationRepository,
} from "../../../modules/relocation/ports.js";
import type { Db } from "../client.js";
import { relocationProfile } from "../schema/index.js";

type Row = typeof relocationProfile.$inferSelect;

function toDomain(row: Row): RelocationProfile {
  return {
    userId: row.userId,
    origin: row.origin,
    destination: row.destination,
    destinationCountryCode: row.destinationCountryCode,
    destinationLat: row.destinationLat,
    destinationLng: row.destinationLng,
    destinationTz: row.destinationTz,
    arrivalDate: row.arrivalDate,
    arrivalTime: row.arrivalTime,
    monthlyBudgetMinor: row.monthlyBudgetMinor,
    housingStatus: row.housingStatus,
    housingBudgetMinor: row.housingBudgetMinor,
    transportPrefs: row.transportPrefs,
    homeLabel: row.homeLabel,
    homeLat: row.homeLat,
    homeLng: row.homeLng,
    onboardingCompletedAt: row.onboardingCompletedAt?.getTime() ?? null,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

export class DrizzleRelocationRepository implements RelocationRepository {
  constructor(private readonly db: Db) {}

  async findByUser(userId: string): Promise<RelocationProfile | null> {
    const rows = await this.db
      .select()
      .from(relocationProfile)
      .where(eq(relocationProfile.userId, userId))
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : toDomain(row);
  }

  async upsert(
    userId: string,
    input: RelocationProfileInput,
    now: number,
  ): Promise<RelocationProfile> {
    const { onboardingCompletedAt, ...rest } = input;
    const values = {
      ...rest,
      onboardingCompletedAt:
        onboardingCompletedAt === null ? null : new Date(onboardingCompletedAt),
    };
    const rows = await this.db
      .insert(relocationProfile)
      .values({ userId, ...values, createdAt: new Date(now), updatedAt: new Date(now) })
      .onConflictDoUpdate({
        target: relocationProfile.userId,
        set: { ...values, updatedAt: new Date(now) },
      })
      .returning();
    const row = rows[0];
    if (row === undefined) {
      throw new Error("Upsert of relocation profile returned no row");
    }
    return toDomain(row);
  }
}
