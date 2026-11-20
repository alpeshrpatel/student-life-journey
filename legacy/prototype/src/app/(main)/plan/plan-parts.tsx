"use client";

import { Loader2, Sparkles } from "lucide-react";

export function PlanSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function StepItem({ index, text }: { index: number; text: string }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-card px-3.5 py-3 shadow-sm">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
        {index}
      </span>
      <span className="text-sm leading-snug">{text}</span>
    </li>
  );
}

export function EmptyPlan({
  generating,
  onGenerate,
}: {
  generating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Sparkles className="mb-4 h-12 w-12 text-primary" />
      <h1 className="text-xl font-bold">No plan yet</h1>
      <p className="mx-auto mt-2 max-w-[260px] text-sm text-muted-foreground">
        Generate a personalized plan organized into Before arrival, First 24 hours,
        First 7 days, and Ongoing.
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-60"
      >
        {generating && <Loader2 className="h-4 w-4 animate-spin" />}
        Generate my plan
      </button>
    </div>
  );
}
