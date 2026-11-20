import { db } from "@/shared/db";
import { daysUntil } from "@/shared/utils";
import type { TaskDTO, UserContext } from "@/shared/types";

/** Maps a Prisma Task to its transport shape. */
export function toTaskDTO(task: {
  id: string;
  title: string;
  description: string | null;
  reason: string | null;
  priority: TaskDTO["priority"];
  phase: TaskDTO["phase"];
  status: TaskDTO["status"];
  category: string | null;
  estimateMinutes: number | null;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}): TaskDTO {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    reason: task.reason,
    priority: task.priority,
    phase: task.phase,
    status: task.status,
    category: task.category,
    estimateMinutes: task.estimateMinutes,
    dueDate: task.dueDate?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
  };
}

/**
 * Builds the shared UserContext (spec §8) — the single structured state
 * every agent reads. Falls back to neutral values pre-onboarding so the
 * concierge can still respond gracefully.
 */
export async function buildUserContext(userId: string): Promise<UserContext> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      relocationProfile: true,
      housingProfile: true,
      tasks: {
        where: { status: "OPEN" },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        take: 30,
      },
    },
  });

  if (!user) throw new Error(`User ${userId} not found`);

  const rp = user.relocationProfile;
  const hp = user.housingProfile;
  const arrival = rp?.arrivalDate ?? new Date();

  return {
    userId,
    name: user.name,
    relocation: {
      origin: rp?.origin ?? "",
      destination: rp?.destination ?? "",
      arrivalDate: arrival,
      arrivalTime: rp?.arrivalTime ?? undefined,
      homeAddress: rp?.homeAddress ?? undefined,
      destinationLat: rp?.destinationLat ?? undefined,
      destinationLng: rp?.destinationLng ?? undefined,
    },
    housing: {
      status: hp?.status ?? "SEARCHING",
      budget: hp?.budget ?? undefined,
    },
    finances: {
      monthlyBudget: rp?.monthlyBudget ?? undefined,
    },
    transportation: {
      preferences: rp?.transportation ?? [],
    },
    preferences: {
      interests: rp?.interests ?? [],
    },
    tasks: user.tasks.map(toTaskDTO),
    daysUntilArrival: daysUntil(arrival),
  };
}
