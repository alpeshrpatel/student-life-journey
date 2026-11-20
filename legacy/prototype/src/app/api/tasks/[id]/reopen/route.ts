import { ok, withAuth } from "@/shared/http";
import { reopenTask } from "@/modules/tasks/task-service";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (_req, ctx: { params: Promise<{ id: string }> }, userId) => {
  const { id } = await ctx.params;
  return ok({ task: await reopenTask(userId, id) });
});
