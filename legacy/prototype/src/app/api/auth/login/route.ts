import { LoginSchema, login } from "@/modules/users/auth-service";
import { ApiError, fail, ok, parseJson } from "@/shared/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const input = await parseJson(req, LoginSchema);
    await login(input);
    return ok({ success: true });
  } catch (err) {
    if (err instanceof ApiError) return fail(err.message, err.status);
    if (err instanceof z.ZodError) return fail("Invalid credentials format", 422);
    console.error("[auth/login]", err);
    return fail("Could not sign in", 500);
  }
}
