import { z } from "zod";

export const FLAG_DEFAULTS = {
  aiEnabled: true,
  conciergeEnabled: true,
  listingPasteEnabled: true,
  placesLiveEnabled: true,
  signupsOpen: true,
  readinessEnabled: false,
  pushEnabled: false,
} as const;

export type FlagKey = keyof typeof FLAG_DEFAULTS;
export type Flags = Record<FlagKey, boolean>;

const FLAG_KEYS = Object.keys(FLAG_DEFAULTS) as FlagKey[];

const FlagOverridesSchema = z.strictObject({
  aiEnabled: z.boolean(),
  conciergeEnabled: z.boolean(),
  listingPasteEnabled: z.boolean(),
  placesLiveEnabled: z.boolean(),
  signupsOpen: z.boolean(),
  readinessEnabled: z.boolean(),
  pushEnabled: z.boolean(),
});

/** Parses the `FLAGS` JSON variable. Unknown keys are rejected; missing keys take their defaults. */
export function parseFlags(json: string): Flags {
  const text = json.trim() === "" ? "{}" : json;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("FLAGS: not valid JSON");
  }
  const parsed = FlagOverridesSchema.partial().safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) =>
      issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message,
    );
    throw new Error(`FLAGS: ${problems.join("; ")}`);
  }
  const overrides = parsed.data;
  const flags = { ...FLAG_DEFAULTS } as Flags;
  for (const key of FLAG_KEYS) {
    const value = overrides[key];
    if (value !== undefined) {
      flags[key] = value;
    }
  }
  return flags;
}
