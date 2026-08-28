"use client";

import { HeartHandshake, PartyPopper } from "lucide-react";
import { formatMoneyClient } from "@/lib/client";
import {
  Chip,
  Field,
  Header,
  INTERESTS,
  ReviewRow,
  TRANSPORT,
  type FormState,
} from "./wizard-parts";

type Setter = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

export function LifestyleStep({
  form,
  toggle,
}: {
  form: FormState;
  toggle: (key: "transportation" | "interests", value: string) => void;
}) {
  return (
    <section className="space-y-6">
      <Header icon={HeartHandshake} title="How do you like to live?" />
      <div>
        <p className="mb-2 text-sm font-medium">Getting around</p>
        <div className="flex flex-wrap gap-2">
          {TRANSPORT.map((t) => (
            <Chip
              key={t.value}
              active={form.transportation.includes(t.value)}
              onClick={() => toggle("transportation", t.value)}
            >
              {t.label}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Interests</p>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <Chip
              key={i.value}
              active={form.interests.includes(i.value)}
              onClick={() => toggle("interests", i.value)}
            >
              {i.label}
            </Chip>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ReviewStep({ form }: { form: FormState }) {
  return (
    <section className="space-y-4">
      <Header icon={PartyPopper} title="Ready for takeoff?" />
      <ReviewRow k="From → To" v={`${form.origin} → ${form.destination}`} />
      <ReviewRow
        k="Arriving"
        v={form.arrivalDate + (form.arrivalTime ? ` at ${form.arrivalTime}` : "")}
      />
      <ReviewRow
        k="Monthly budget"
        v={formatMoneyClient(Number(form.monthlyBudget))}
      />
      <ReviewRow
        k="Housing"
        v={
          form.housingStatus === "SEARCHING"
            ? `Searching · ${formatMoneyClient(Number(form.housingBudget))}/mo`
            : "Secured ✓"
        }
      />
      <ReviewRow
        k="Lifestyle"
        v={[...form.transportation, ...form.interests].join(", ") || "—"}
      />
      <p className="rounded-xl bg-primary/5 p-4 text-sm leading-relaxed text-muted-foreground ring-1 ring-primary/15">
        Your plan is generated from exactly these answers — update them anytime in
        Settings and it regenerates.
      </p>
    </section>
  );
}

export { Field };
