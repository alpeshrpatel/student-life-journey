"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type {
  AffordabilityEvaluation,
  HousingCostResult,
  MoveInCostResult,
} from "@/tools/calculator/housing-calculator";
import { formatMoneyClient } from "@/lib/client";

interface Explanation {
  verdict: string;
  explanation: string;
  tips: string[];
}

const VERDICT_STYLES = {
  COMPATIBLE: {
    icon: CheckCircle2,
    cls: "border-green-500/30 bg-green-500/5 text-green-700",
    label: "Compatible with your budget",
    emoji: "✅",
  },
  TIGHT: {
    icon: AlertTriangle,
    cls: "border-amber-500/30 bg-amber-500/5 text-amber-700",
    label: "Tight on your budget",
    emoji: "⚠️",
  },
  OVER: {
    icon: AlertTriangle,
    cls: "border-red-500/30 bg-red-500/5 text-red-700",
    label: "Over your budget",
    emoji: "⛔️",
  },
} as const;

export function HousingResult({
  monthly,
  moveIn,
  evaluation,
  explanation,
}: {
  monthly: HousingCostResult;
  moveIn: MoveInCostResult;
  evaluation: AffordabilityEvaluation;
  explanation: Explanation;
}) {
  const style = VERDICT_STYLES[evaluation.verdict];
  const VerdictIcon = style.icon;

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-3 rounded-xl border p-4 ${style.cls}`}>
        <VerdictIcon className="h-6 w-6 shrink-0" />
        <div>
          <p className="text-sm font-bold">{style.emoji} {style.label}</p>
          {evaluation.referenceBudget > 0 && (
            <p className="text-xs opacity-80">
              vs. budget of {formatMoneyClient(evaluation.referenceBudget)}/month
              ({evaluation.budgetSource === "HOUSING_BUDGET" ? "housing" : "total"} budget)
            </p>
          )}
        </div>
      </div>

      <CostBreakdown
        title="Real monthly housing cost"
        lines={monthly.lines}
        total={monthly.total}
      />

      <CostBreakdown title="Move-in cash required" lines={moveIn.lines} total={moveIn.total} />

      {moveIn.assumptions.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-secondary/60 p-3.5">
          {moveIn.assumptions.map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              {a}
            </li>
          ))}
        </ul>
      )}

      <section className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">AI explanation</p>
        <p className="mt-2 text-sm leading-relaxed">{explanation.explanation}</p>
        {explanation.tips.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {explanation.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <span className="mt-0.5 shrink-0 text-primary">→</span>
                {tip}
              </li>
            ))}
          </ul>
        )}
      </section>

      {evaluation.flags.length > 0 && (
        <section className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent">
            <AlertTriangle className="h-3.5 w-3.5" /> Risk flags
          </p>
          {evaluation.flags.map((f, i) => (
            <p key={i} className="rounded-lg bg-accent/10 px-3 py-2 text-xs leading-relaxed">
              ⚠️ {f}
            </p>
          ))}
        </section>
      )}

      <p className="pb-2 text-center text-[11px] leading-relaxed text-muted-foreground">
        Calculated from YOUR inputs only. This tool never invents listings or
        prices and does not verify properties — always confirm terms with the landlord.
      </p>
    </div>
  );
}

function CostBreakdown({
  title,
  lines,
  total,
}: {
  title: string;
  lines: { label: string; amount: number; assumed?: boolean }[];
  total: number;
}) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <p className="border-b border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="px-4 py-2">
        {lines.map((l) => (
          <li key={l.label} className="flex items-center justify-between py-1.5 text-sm">
            <span className={l.amount === 0 ? "text-muted-foreground/50" : ""}>
              {l.label}
              {l.assumed && (
                <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
                  assumed
                </span>
              )}
            </span>
            <span className={`font-medium ${l.amount === 0 ? "text-muted-foreground/50" : ""}`}>
              {formatMoneyClient(l.amount)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-border bg-secondary/40 px-4 py-3">
        <span className="text-sm font-bold">Total</span>
        <span className="text-lg font-extrabold text-primary">{formatMoneyClient(total)}</span>
      </div>
    </section>
  );
}
