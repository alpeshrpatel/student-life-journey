import type { HousingStatus, IsoDate, TransportPref } from "@slj/domain";

export interface RelocationProfile {
  userId: string;
  origin: string;
  destination: string;
  destinationCountryCode: string | null;
  destinationLat: number | null;
  destinationLng: number | null;
  destinationTz: string | null;
  arrivalDate: IsoDate;
  arrivalTime: string | null;
  monthlyBudgetMinor: number | null;
  housingStatus: HousingStatus;
  housingBudgetMinor: number | null;
  transportPrefs: TransportPref[];
  homeLabel: string | null;
  homeLat: number | null;
  homeLng: number | null;
  /** Epoch milliseconds. */
  onboardingCompletedAt: number | null;
  /** Epoch milliseconds. */
  createdAt: number;
  /** Epoch milliseconds. */
  updatedAt: number;
}

export type RelocationProfileInput = Omit<RelocationProfile, "userId" | "createdAt" | "updatedAt">;

export interface RelocationRepository {
  findByUser(userId: string): Promise<RelocationProfile | null>;
  /** Inserts or updates the profile in one statement; `createdAt` is kept on update. */
  upsert(userId: string, input: RelocationProfileInput, now: number): Promise<RelocationProfile>;
}
