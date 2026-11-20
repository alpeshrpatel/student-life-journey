import { z } from "zod";

export const ConfigResponseSchema = z.object({
  flags: z.record(z.string(), z.boolean()),
  minClientVersion: z.string(),
  legal: z.object({ privacyVersion: z.string(), termsVersion: z.string() }),
});
export type ConfigResponse = z.infer<typeof ConfigResponseSchema>;
