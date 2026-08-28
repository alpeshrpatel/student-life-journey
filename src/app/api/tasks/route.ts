import { ok, withAuth, parseJson } from "@/shared/http";
import {
  listTasks,
  addManualTask,
  CreateTaskSchema,
} from "@/modules/tasks/task-service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, _ctx, userId) => {
  return ok({ tasks: await listTasks(userId) });
});

export const POST = withAuth(async (req, _ctx, userId) => {
  const input = await parseJson(req, CreateTaskSchema);
  return ok({ task: await addManualTask(userId, input) });
});
