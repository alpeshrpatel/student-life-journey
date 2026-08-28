"use client";

import { Check, Loader2, RotateCcw } from "lucide-react";
import { PRIORITY_META, PHASE_LABELS } from "@/lib/client";
import type { TaskDTO } from "@/shared/types";

export function TaskRow({
  task,
  busy,
  onToggle,
}: {
  task: TaskDTO;
  busy: boolean;
  onToggle: () => void;
}) {
  const done = task.status === "DONE";
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            done
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30 hover:border-primary"
          }`}
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : done ? (
            <Check className="h-3.5 w-3.5" />
          ) : null}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold ${done ? "text-muted-foreground line-through" : ""}`}
          >
            {PRIORITY_META[task.priority]?.emoji} {task.title}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {PHASE_LABELS[task.phase]} · {PRIORITY_META[task.priority]?.label}
            {task.estimateMinutes != null ? ` · ~${task.estimateMinutes} min` : ""}
            {task.source === "USER" ? " · added by you" : ""}
          </p>
          {!done && (task.reason || task.description) && (
            <details className="mt-1.5">
              <summary className="cursor-pointer text-[11px] font-medium text-primary">
                Why is this important?
              </summary>
              <p className="mt-1 rounded-lg bg-secondary/70 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                {task.reason ?? task.description}
              </p>
            </details>
          )}
        </div>

        {done && (
          <button
            type="button"
            onClick={onToggle}
            disabled={busy}
            aria-label={`Reopen ${task.title}`}
            className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
