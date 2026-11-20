"use client";

import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { api } from "@/lib/client";
import type {
  AffordabilityEvaluation,
  HousingCostResult,
  MoveInCostResult,
} from "@/tools/calculator/housing-calculator";
import { EMPTY_FORM, Group, NumberField } from "./form-parts";
import { HousingResult } from "./result";

type FormState = typeof EMPTY_FORM;

type EvalResponse = {
  monthly: HousingCostResult;
  moveIn: MoveInCostResult;
  evaluation: AffordabilityEvaluation;
  explanation: { verdict: string; explanation: string; tips: string[] };
};

export default function HousingPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [result, setResult] = useState<EvalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function evaluate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.rent || Number(form.rent) <= 0) {
      setError("Rent is required to run the numbers.");
      return;
    }
    setLoading(true);
    try {
      const body = Object.fromEntries(
        Object.entries(form)
          .map(([k, v]) => [k, v === "" ? undefined : Number(v)])
          .filter(([, v]) => v !== undefined),
      );
      setResult(await api<EvalResponse>("/api/housing/evaluate", { body }));
      setTimeout(
        () =>
          document
            .getElementById("housing-result")
            ?.scrollIntoView({ behavior: "smooth" }),
        60,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Housing & cost check</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste the numbers from any listing. We compute the{" "}
          <strong>real</strong> monthly cost and the cash you need on day one.
        </p>
      </div>

      <form onSubmit={evaluate} className="space-y-4">
        <NumberField
          label="Monthly rent *"
          value={form.rent}
          onChange={set("rent")}
          placeholder="1200"
        />

        <Group title="Monthly recurring">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Utilities" value={form.utilities} onChange={set("utilities")} placeholder="80" />
            <NumberField label="Internet" value={form.internet} onChange={set("internet")} placeholder="45" />
            <NumberField label="Transportation" value={form.transportation} onChange={set("transportation")} placeholder="70" />
            <NumberField label="Laundry" value={form.laundry} onChange={set("laundry")} placeholder="20" />
            <NumberField label="Recurring fees" value={form.recurringFees} onChange={set("recurringFees")} placeholder="0" />
          </div>
        </Group>

        <Group title="One-time move-in">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Deposit (blank = 1 month)" value={form.deposit} onChange={set("deposit")} placeholder="—" />
            <NumberField label="Application fee" value={form.applicationFee} onChange={set("applicationFee")} placeholder="50" />
            <NumberField label="Connectivity setup" value={form.connectivitySetup} onChange={set("connectivitySetup")} placeholder="40" />
            <NumberField label="Furniture / setup" value={form.furnitureSetup} onChange={set("furnitureSetup")} placeholder="150" />
            <NumberField label="Initial groceries" value={form.initialGroceries} onChange={set("initialGroceries")} placeholder="90" />
            <NumberField label="Transport setup" value={form.transportationSetup} onChange={set("transportationSetup")} placeholder="30" />
          </div>
        </Group>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Run the numbers
        </button>
      </form>

      {result && (
        <div id="housing-result" className="pt-2">
          <HousingResult
            monthly={result.monthly}
            moveIn={result.moveIn}
            evaluation={result.evaluation}
            explanation={result.explanation}
          />
        </div>
      )}
    </div>
  );
}
