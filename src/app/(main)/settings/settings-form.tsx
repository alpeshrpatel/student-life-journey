"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Save } from "lucide-react";
import { api } from "@/lib/client";
import { ContextSections, type RelocationForm } from "./context-sections";

export function SettingsForm({
  email,
  name,
  relocation,
  housing,
}: {
  email: string;
  name: string | null;
  relocation: RelocationForm | null;
  housing: { status: "SECURED" | "SEARCHING"; budget: string } | null;
}) {
  const router = useRouter();
  const [formName, setFormName] = useState(name ?? "");
  const [form, setForm] = useState<RelocationForm>(
    relocation ?? {
      origin: "",
      destination: "",
      arrivalDate: "",
      arrivalTime: "",
      monthlyBudget: "",
      homeAddress: "",
      transportation: [],
      interests: [],
    },
  );
  const [status, setStatus] = useState<"SECURED" | "SEARCHING">(housing?.status ?? "SEARCHING");
  const [housingBudget, setHousingBudget] = useState(housing?.budget ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof RelocationForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggle = (k: "transportation" | "interests", v: string) =>
    setForm((f) => ({
      ...f,
      [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v],
    }));

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await api("/api/profile", {
        method: "PUT",
        body: {
          name: formName.trim() || undefined,
          ...(form.origin && { origin: form.origin }),
          ...(form.destination && { destination: form.destination }),
          ...(form.arrivalDate && { arrivalDate: form.arrivalDate }),
          arrivalTime: form.arrivalTime || null,
          monthlyBudget: form.monthlyBudget ? Number(form.monthlyBudget) : null,
          housingStatus: status,
          housingBudget: housingBudget ? Number(housingBudget) : null,
          homeAddress: form.homeAddress || null,
          transportation: form.transportation,
          interests: form.interests,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await api("/api/auth/logout", { body: {} });
    router.replace("/signin");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-semibold">{name || "Your profile"}</p>
        <p className="text-xs text-muted-foreground">{email}</p>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Display name
          </span>
          <input value={formName} onChange={(e) => setFormName(e.target.value)} className="inp" />
        </label>
      </section>

      <ContextSections
        form={form}
        set={set}
        toggle={toggle}
        status={status}
        setStatus={setStatus}
        housingBudget={housingBudget}
        setHousingBudget={setHousingBudget}
      />

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3 pb-4">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved ✓ Plan updating…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-destructive/40 text-destructive"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <style jsx global>{`
        .inp {
          height: 2.75rem;
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid hsl(var(--input));
          background: hsl(var(--background));
          padding: 0 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .inp:focus {
          box-shadow: 0 0 0 2px hsl(var(--ring));
        }
      `}</style>
    </div>
  );
}
