"use client";

import { Field, Chips, INTEREST_LABELS, Section, TRANSPORT, TRANSPORT_LABELS } from "./settings-parts";

export interface RelocationForm {
  origin: string;
  destination: string;
  arrivalDate: string;
  arrivalTime: string;
  monthlyBudget: string;
  homeAddress: string;
  transportation: string[];
  interests: string[];
}

export function ContextSections({
  form,
  set,
  toggle,
  status,
  setStatus,
  housingBudget,
  setHousingBudget,
}: {
  form: RelocationForm;
  set: (k: keyof RelocationForm) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggle: (k: "transportation" | "interests", v: string) => void;
  status: "SECURED" | "SEARCHING";
  setStatus: (s: "SECURED" | "SEARCHING") => void;
  housingBudget: string;
  setHousingBudget: (v: string) => void;
}) {
  return (
    <>
      <Section title="Relocation context">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Coming from">
            <input value={form.origin} onChange={set("origin")} className="inp" />
          </Field>
          <Field label="Moving to">
            <input value={form.destination} onChange={set("destination")} className="inp" />
          </Field>
          <Field label="Arrival date">
            <input type="date" value={form.arrivalDate} onChange={set("arrivalDate")} className="inp" />
          </Field>
          <Field label="Arrival time">
            <input type="time" value={form.arrivalTime} onChange={set("arrivalTime")} className="inp" />
          </Field>
        </div>
        <Field label={`Monthly budget${form.monthlyBudget ? ` ($${form.monthlyBudget})` : ""}`}>
          <input
            type="number"
            inputMode="decimal"
            value={form.monthlyBudget}
            onChange={set("monthlyBudget")}
            className="inp"
          />
        </Field>
        <Field label="Home address in the new city (optional)">
          <input
            value={form.homeAddress}
            onChange={set("homeAddress")}
            placeholder="Street, area or neighborhood"
            className="inp"
          />
        </Field>
        <p className="rounded-lg bg-primary/5 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground ring-1 ring-primary/15">
          Changing your arrival date or housing status automatically regenerates your plan.
        </p>
      </Section>

      <Section title="Housing">
        <div className="grid grid-cols-2 gap-3">
          {(["SEARCHING", "SECURED"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-xl border p-3.5 text-left text-sm font-semibold transition-colors ${
                status === s ? "border-primary bg-primary/5 ring-2 ring-ring/30" : "border-input"
              }`}
            >
              {s === "SEARCHING" ? "🔍 Searching" : "✅ Secured"}
            </button>
          ))}
        </div>
        {status === "SEARCHING" && (
          <Field label="Housing budget ($/mo)">
            <input
              type="number"
              inputMode="decimal"
              value={housingBudget}
              onChange={(e) => setHousingBudget(e.target.value)}
              className="inp"
            />
          </Field>
        )}
      </Section>

      <Section title="Lifestyle">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Transportation</p>
        <Chips
          options={TRANSPORT.map((t) => ({ value: t, label: TRANSPORT_LABELS[t] }))}
          active={form.transportation}
          onToggle={(v) => toggle("transportation", v)}
        />
        <p className="mb-1.5 mt-3 text-xs font-medium text-muted-foreground">Interests</p>
        <Chips
          options={Object.entries(INTEREST_LABELS).map(([value, label]) => ({ value, label }))}
          active={form.interests}
          onToggle={(v) => toggle("interests", v)}
        />
      </Section>
    </>
  );
}
