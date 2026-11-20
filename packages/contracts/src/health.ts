import { z } from "zod";
import { IsoInstantSchema } from "./common.js";

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  version: z.string(),
  time: IsoInstantSchema,
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
