"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Home,
  MapPin,
  MessageCircleHeart,
  Sparkles,
  ListChecks,
} from "lucide-react";
import { api } from "@/lib/client";
import type { DashboardData, TaskDTO } from "@/shared/types";
import {
  DashboardSkeleton,
  PriorityTaskCard,
  QuickLink,
  StateCard,
} from "./parts";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<DashboardData>("/api/dashboard"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function complete(task: TaskDTO) {
    setCompleting(task.id);
    try {
      await api(`/api/tasks/${task.id}/complete`, { body: {} });
      await load();
    } finally {
      setCompleting(null);
    }
  }

  if (error) {
    return <StateCard title="Something went wrong" message={error} retry={load} />;
  }
  if (!data) return <DashboardSkeleton />;

  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? "Up late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const days = data.daysUntilArrival;
  const countdown = !data.arrived
    ? `You arrive in ${days} day${days === 1 ? "" : "s"}`
    : days === 0
      ? "Arrival day! 🎉"
      : `${-days} day${days === -1 ? "" : "s"} since you arrived`;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}
          {data.greetingName ? `, ${data.greetingName}` : ""} 👋
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          {countdown} · {data.origin} →{" "}
          <span className="font-medium text-foreground">{data.destination}</span>
        </p>
        {data.housingStatus === "SEARCHING" && (
          <Link
            href="/housing"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent"
          >
            🏠 Housing still searching — evaluate options
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </section>

      <section aria-label="Top priorities">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Top priorities
          </h2>
          <Link href="/tasks" className="text-xs font-medium text-primary hover:underline">
            All tasks
          </Link>
        </div>

        {data.topPriorities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-5 text-center">
            <p className="text-sm font-medium">All caught up! ✨</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Open the Plan tab for what&rsquo;s next in your journey.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {data.topPriorities.map((task) => (
              <PriorityTaskCard
                key={task.id}
                task={task}
                expanded={expandedId === task.id}
                onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
                onComplete={() => void complete(task)}
                completing={completing === task.id}
              />
            ))}
          </ul>
        )}
      </section>

      {data.nextAction && data.nextAction.kind !== "TASK" && (
        <section aria-label="Next step">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Next
          </h2>
          <Link href={data.nextAction.href}>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-primary p-4 text-primary-foreground shadow-lg shadow-primary/20">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{data.nextAction.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs opacity-80">
                  {data.nextAction.description}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </div>
          </Link>
        </section>
      )}

      <section aria-label="Quick actions">
        <div className="grid grid-cols-2 gap-3">
          <QuickLink href="/housing" icon={Home} label="Housing costs" sub="Monthly + move-in" />
          <QuickLink href="/places" icon={MapPin} label="Essential places" sub="Near your home" />
          <QuickLink
            href="/plan"
            icon={Sparkles}
            label="My plan"
            sub={data.stats.planVersion != null ? `v${data.stats.planVersion}` : "Generate now"}
          />
          <QuickLink
            href="/concierge"
            icon={MessageCircleHeart}
            label="Ask concierge"
            sub='"What should I do today?"'
          />
        </div>
      </section>

      <section className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5" />
          {data.stats.doneTasks} done · {data.stats.openTasks} open
        </span>
      </section>
    </div>
  );
}
