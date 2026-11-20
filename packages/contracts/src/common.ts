import { z } from "zod";

export const MoneySchema = z.object({
  amountMinor: z.number().int(),
  currency: z.string().length(3),
});
export type Money = z.infer<typeof MoneySchema>;

export const IsoInstantSchema = z.string().datetime();
