import { ok } from "@/shared/http";
import { signOut } from "@/modules/users/auth-service";

export const dynamic = "force-dynamic";

export async function POST() {
  await signOut();
  return ok({ success: true });
}
