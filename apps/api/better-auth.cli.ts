import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

/** Generator input only: `auth generate` reads this file. It is never imported by the Worker. */
export const auth = betterAuth({
  database: drizzleAdapter({}, { provider: "sqlite" }),
  socialProviders: { google: { clientId: "x", clientSecret: "x" } },
});
