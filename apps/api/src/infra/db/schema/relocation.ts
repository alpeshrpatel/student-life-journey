import type { TransportPref } from "@slj/domain";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth.js";

export const relocationProfile = sqliteTable("relocation_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  destinationCountryCode: text("destination_country_code"),
  destinationLat: real("destination_lat"),
  destinationLng: real("destination_lng"),
  destinationTz: text("destination_tz"),
  arrivalDate: text("arrival_date").notNull(), // YYYY-MM-DD
  arrivalTime: text("arrival_time"), // HH:mm
  monthlyBudgetMinor: integer("monthly_budget_minor"),
  housingStatus: text("housing_status", { enum: ["SEARCHING", "SECURED"] }).notNull(),
  housingBudgetMinor: integer("housing_budget_minor"),
  transportPrefs: text("transport_prefs", { mode: "json" }).$type<TransportPref[]>().notNull(),
  homeLabel: text("home_label"), // coarse, user-typed, e.g. "Downtown Phoenix"
  homeLat: real("home_lat"),
  homeLng: real("home_lng"),
  onboardingCompletedAt: integer("onboarding_completed_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
