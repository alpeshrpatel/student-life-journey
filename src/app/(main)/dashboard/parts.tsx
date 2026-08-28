"use client";

import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { PRIORITY_META } from "@/lib/client";
import type { TaskDTO } from "@/shared/types";

export function QuickLink({
  href,
  icon: Icon,
  label,
  sub,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
    >
      <Icon className="mb-2 h-5 w-5 text-primary" />
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </Link>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div>
        <div className="h-8 w-48 rounded-lg bg-secondary" />
        <div className="mt-2 h-4 w-64 rounded bg-secondary" />
      </div>
      <div className="space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[76px] rounded-xl bg-secondary" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-secondary" />
        ))}
      </div>
    </div>
  );
}

export function StateCard({
  title,
  message,
  retry,
}: {
  title: string;
  message: string;
  retry: () => void;
}) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <p className="font-semibold text-destructive">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Try again
      </button>
    </div>
  );
}

export function PriorityTaskCard({
  task,
  expanded,
  onToggle,
  onComplete,
  completing,
}: {
  task: TaskDTO;
  expanded: boolean;
  onToggle: () => void;
  onComplete: () => void;
  completing: boolean;
}) {
  const meta = PRIORITY_META[task.priority];
  const why = task.reason ?? task.description;

  return (
    <li>
      <div className="rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-start gap-3 p-4">
          <button
            type="button"
            onClick={onComplete}
            disabled={completing}
            aria-label={`Complete: ${task.title}`}
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 text-transparent transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <div className="min-w-0 flex-1">
            <button type="button" onClick={onToggle} className="w-full text-left">
              <p className="truncate text-sm font-semibold">
                {meta?.emoji ?? "•"} {task.title}
              </p>
              <p className={`text-xs ${meta?.className ?? "text-muted-foreground"}`}>
                {meta?.label ?? task.priority}
                {task.phase !== "BEFORE_ARRIVAL"
                  ? ` · ${task.phase.replace(/_/g, " ").toLowerCase()}`
                  : ""}
                {task.estimateMinutes != null ? ` · ~${task.estimateMinutes} min` : ""}
                {why ? " · why?" : ""}
              </p>
            </button>

            {expanded && why && (
              <p className="mt-2 rounded-lg bg-secondary/70 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                {why}
              </p>
            )}
          </div>
          <ChevronDown
            className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>
    </li>
  );
}
