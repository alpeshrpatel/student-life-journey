"use client";

import { PlaneTakeoff, Wallet2 } from "lucide-react";
import { formatMoneyClient } from "@/lib/client";
import {
  Field,
  Header,
  type FormState,
} from "./wizard-parts";

type Setter = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

export function RouteStep({ form, set }: { form: FormState; set: Setter }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <section className="space-y-5">
      <Header icon={PlaneTakeoff} title="Where are you headed?" />
      <Field label="Coming from">
        <input
          autoFocus
          value={form.origin}
          onChange={(e) => set("origin", e.target.value)}
          placeholder="City you're leaving"
          className="input"
        />
      </Field>
      <Field label="Moving to">
        <input
          value={form.destination}
          onChange={(e) => set("destination", e.target.value)}
          placeholder="City you're moving to"
          className="input"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Arrival date">
          <input
            type="date"
            min={today}
            value={form.arrivalDate}
            onChange={(e) => set("arrivalDate", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Arrival time (optional)">
          <input
            type="time"
            value={form.arrivalTime}
            onChange={(e) => set("arrivalTime", e.target.value)}
            className="input"
          />
        </Field>
      </div>
    </section>
  );
}

export function MoneyStep({ form, set }: { form: FormState; set: Setter }) {
  return (
    <section className="space-y-5">
      <Header icon={Wallet2} title="Budget & housing" />
      <Field
        label={`Total monthly budget${
          form.monthlyBudget
            ? ` (${formatMoneyClient(Number(form.monthlyBudget))})`
            : ""
        }`}
      >
        <input
          type="number"
          min={0}
          inputMode="decimal"
          value={form.monthlyBudget}
          onChange={(e) => set("monthlyBudget", e.target.value)}
          placeholder="e.g. 2200"
          className="input"
        />
      </Field>

      <div>
        <p className="mb-2 text-sm font-medium">Housing status</p>
        <div className="grid grid-cols-2 gap-3">
          {(["SEARCHING", "SECURED"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => set("housingStatus", status)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                form.housingStatus === status
                  ? "border-primary bg-primary/5 ring-2 ring-ring/30"
                  : "border-input"
              }`}
            >
              <p className="text-sm font-semibold">
                {status === "SEARCHING" ? "🔍 Still searching" : "✅ Already secured"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {form.housingStatus === "SEARCHING" && (
        <Field label="Monthly housing budget">
          <input
            type="number"
            min={0}
            inputMode="decimal"
            value={form.housingBudget}
            onChange={(e) => set("housingBudget", e.target.value)}
            placeholder="e.g. 1200"
            className="input"
          />
        </Field>
      )}
    </section>
  );
}
