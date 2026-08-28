import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/shared/auth/session";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data as object, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type Handler<Ctx> = (
  req: Request,
  ctx: Ctx,
  userId: string,
) => Promise<Response> | Response;

/** Wraps a route handler with auth + uniform error mapping. */
export function withAuth<Ctx>(handler: Handler<Ctx>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      const userId = await getSessionUserId();
      if (!userId) return fail("Not authenticated", 401);
      return await handler(req, ctx, userId);
    } catch (err) {
      if (err instanceof ApiError) return fail(err.message, err.status);
      if (err instanceof z.ZodError) {
        const first = err.errors[0];
        return fail(
          first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input",
          422,
        );
      }
      console.error("[api] Unhandled error:", err);
      return fail("Something went wrong", 500);
    }
  };
}

export async function parseJson<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError("Invalid JSON body", 400);
  }
  return schema.parse(raw);
}
