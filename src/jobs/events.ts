import { registerJobHandler, enqueue } from "./queue";

export type DomainEvent =
  | { type: "OnboardingCompleted"; userId: string }
  | { type: "RelocationPlanGenerated"; userId: string; planId: string }
  | { type: "ArrivalDateChanged"; userId: string }
  | { type: "HousingStatusChanged"; userId: string; status: "SECURED" | "SEARCHING" }
  | { type: "HousingSecured"; userId: string }
  | { type: "TaskCompleted"; userId: string; taskId: string };

type Handler = (event: DomainEvent) => void;

const globalForBus = globalThis as unknown as {
  __sljEventHandlers?: Handler[];
};

const handlers = globalForBus.__sljEventHandlers ?? [];
globalForBus.__sljEventHandlers = handlers;

export function onDomainEvent(handler: Handler): void {
  handlers.push(handler);
}

export function emitDomainEvent(event: DomainEvent): void {
  ensureJobsWired();
  for (const handler of handlers) {
    try {
      handler(event);
    } catch (err) {
      console.error("[events] handler error:", err);
    }
  }
}

// ---------------------------------------------------------------------------
// Bootstrap: event → job wiring. Runs once per process.
// Dynamic imports inside handlers keep this module free of static cycles.
const globalForBootstrap = globalThis as unknown as { __sljJobsWired?: boolean };

export function ensureJobsWired(): void {
  if (globalForBootstrap.__sljJobsWired) return;
  globalForBootstrap.__sljJobsWired = true;

  registerJobHandler("REGENERATE_PLAN", async (payload) => {
    const userId = String(payload.userId ?? "");
    const reason = String(payload.reason ?? "context-changed");
    if (!userId) return;
    const { generatePlan } = await import("@/modules/plans/life-plan-service");
    await generatePlan(userId, reason);
  });

  onDomainEvent((event) => {
    switch (event.type) {
      case "OnboardingCompleted":
        enqueue("REGENERATE_PLAN", { userId: event.userId, reason: "onboarding" });
        break;
      case "ArrivalDateChanged":
        enqueue("REGENERATE_PLAN", { userId: event.userId, reason: "arrival-date-changed" });
        break;
      case "HousingSecured":
      case "HousingStatusChanged":
        enqueue("REGENERATE_PLAN", {
          userId: event.userId,
          reason:
            event.type === "HousingSecured" ? "housing-secured" : "housing-status-changed",
        });
        break;
      default:
        // TaskCompleted and RelocationPlanGenerated need no follow-up work.
        break;
    }
  });
}
