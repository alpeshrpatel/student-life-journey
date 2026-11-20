import { z } from "zod";

export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export type IsoDate = z.infer<typeof IsoDateSchema>;

export const TimeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const HousingStatusSchema = z.enum(["SEARCHING", "SECURED"]);
export type HousingStatus = z.infer<typeof HousingStatusSchema>;

export const TransportPrefSchema = z.enum([
  "PUBLIC_TRANSIT",
  "WALKING",
  "BIKE",
  "CAR",
  "RIDESHARE",
]);
export type TransportPref = z.infer<typeof TransportPrefSchema>;
