"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { api } from "@/lib/client";
import {
  GeneratingState,
  type FormState,
} from "./wizard-parts";
import { RouteStep, MoneyStep } from "./steps-route-money";
import { LifestyleStep, ReviewStep } from "./steps-life-review";

const STEPS = ["Your route", "Budget & housing", "Lifestyle", "Review"];

const INITIAL: FormState = {
  origin: "",
  destination: "",
  arrivalDate: "",
  arrivalTime: "",
  monthlyBudget: "",
  housingStatus: "SEARCHING",
  housingBudget: "",
  transportation: ["PUBLIC_TRANSIT"],
  interests: [],
};

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggle = (key: "transportation" | "interests", value: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value)
        ? f[key].filter((v) => v !== value)
        : [...f[key], value],
    }));

  function validateStep(): boolean {
    setError(null);
    if (step === 0) {
      if (!form.origin.trim() || !form.destination.trim()) {
        return fail("Tell us both cities so we can plan the journey.");
      }
      if (!form.arrivalDate) return fail("When do you arrive?");
    }
    if (step === 1) {
      if (!form.monthlyBudget || Number(form.monthlyBudget) <= 0) {
        return fail("A monthly budget keeps every recommendation honest.");
      }
      if (form.housingStatus === "SEARCHING" && !form.housingBudget) {
        return fail("What's your target monthly housing budget? A rough number is fine.");
      }
    }
    if (step === STEPS.length - 1) {
      void submit();
      return true;
    }
    setStep((s) => s + 1);
    return true;
  }

  function fail(message: string): boolean {
    setError(message);
    return false;
  }

  async function submit(): Promise<boolean> {
    setSubmitting(true);
    try {
      await api("/api/onboarding", {
        body: {
          origin: form.origin.trim(),
          destination: form.destination.trim(),
          arrivalDate: form.arrivalDate,
          arrivalTime: form.arrivalTime || undefined,
          monthlyBudget: Number(form.monthlyBudget),
          housingStatus: form.housingStatus,
          housingBudget:
            form.housingStatus === "SEARCHING" ? Number(form.housingBudget) : null,
          transportation: form.transportation,
          interests: form.interests,
        },
      });
      try {
        await api("/api/plan/generate", { body: { reason: "onboarding" } });
      } catch {
        // generation also runs via the event-driven job; dashboard handles it
      }
      router.replace("/dashboard");
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
      return false;
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span>{STEPS[step]}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {submitting ? (
        <GeneratingState destination={form.destination} />
      ) : (
        <>
          {step === 0 && <RouteStep form={form} set={set} />}
          {step === 1 && <MoneyStep form={form} set={set} />}
          {step === 2 && <LifestyleStep form={form} toggle={toggle} />}
          {step === 3 && <ReviewStep form={form} />}

          {error && (
            <p className="mt-5 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mt-auto flex gap-3 pt-8">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-input"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={validateStep}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.98]"
            >
              {step === STEPS.length - 1 ? "Generate my plan" : "Continue"}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </>
      )}

      <style jsx global>{`
        .input {
          height: 2.75rem;
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid hsl(var(--input));
          background: hsl(var(--background));
          padding: 0 0.75rem;
          font-size: 1rem;
          outline: none;
        }
        .input:focus {
          box-shadow: 0 0 0 2px hsl(var(--ring));
        }
      `}</style>
    </main>
  );
}
