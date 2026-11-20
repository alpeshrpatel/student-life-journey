import { z } from "zod";
import { ok, parseJson, ApiError, fail } from "@/shared/http";
import { register, RegisterSchema } from "@/modules/users/auth-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const input = await parseJson(req, RegisterSchema);
    await register(input);
    return ok({ success: true });
  } catch (err) {
    if (err instanceof ApiError) return fail(err.message, err.status);
    if (err instanceof z.ZodError) return fail("Invalid email or password format", 422);
    console.error("[auth/register]", err);
    return fail("Could not create account", 500);
  }
}
