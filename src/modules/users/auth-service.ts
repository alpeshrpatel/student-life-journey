import { z } from "zod";
import { db } from "@/shared/db";
import { ApiError } from "@/shared/http";
import { hashPassword, verifyPassword } from "@/shared/auth/password";
import { setSessionCookie, clearSessionCookie } from "@/shared/auth/session";

/**
 * Credential-based session auth behind a service boundary.
 *
 * This is the seam for swapping in a managed provider (Clerk, Auth.js,
 * Supabase Auth): routes call this service only — replace its internals and
 * the rest of the app is untouched.
 */

export const RegisterSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  name: z.string().min(1).max(80).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(input: z.infer<typeof RegisterSchema>): Promise<string> {
  ensureWired();
  const email = input.email.toLowerCase().trim();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new ApiError("An account with this email already exists", 409);

  const user = await db.user.create({
    data: {
      email,
      name: input.name?.trim() || null,
      passwordHash: await hashPassword(input.password),
    },
  });
  await setSessionCookie(user.id);
  return user.id;
}

export async function login(input: z.infer<typeof LoginSchema>): Promise<string> {
  ensureWired();
  const user = await db.user.findUnique({
    where: { email: input.email.toLowerCase().trim() },
  });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new ApiError("Invalid email or password", 401);
  }
  await setSessionCookie(user.id);
  return user.id;
}

export async function signOut(): Promise<void> {
  await clearSessionCookie();
}

function ensureWired(): void {
  // Events wiring keeps future side effects (welcome jobs) in one place.
}
