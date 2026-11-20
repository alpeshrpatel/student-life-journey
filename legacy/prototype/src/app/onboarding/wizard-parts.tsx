"use client";

import type { ReactNode } from "react";
import { Loader2, PartyPopper } from "lucide-react";

export const TRANSPORT = [
  { value: "PUBLIC_TRANSIT", label: "🚌 Public transit" },
  { value: "WALKING", label: "🚶 Walking" },
  { value: "BIKE", label: "🚲 Bike" },
  { value: "CAR", label: "🚗 Car" },
  { value: "RIDESHARE", label: "🚕 Rideshare" },
] as const;

export const INTERESTS = [
  { value: "FOOD", label: "🍜 Food" },
  { value: "OUTDOORS", label: "🌲 Outdoors" },
  { value: "FITNESS", label: "🏋️ Fitness" },
  { value: "ARTS", label: "🎨 Arts" },
  { value: "NIGHTLIFE", label: "🌃 Nightlife" },
  { value: "TECH", label: "💻 Tech" },
  { value: "GAMING", label: "🎮 Gaming" },
  { value: "STUDY_SPOTS", label: "📚 Study spots" },
] as const;

export interface FormState {
  origin: string;
  destination: string;
  arrivalDate: string;
  arrivalTime: string;
  monthlyBudget: string;
  housingStatus: "SECURED" | "SEARCHING";
  housingBudget: string;
  transportation: string[];
  interests: string[];
}

export function Header({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <h1 className="flex items-center gap-2 text-xl font-bold">
      <Icon className="h-5 w-5 text-primary" />
      {title}
    </h1>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${
        active
          ? "border-primary bg-primary/10 font-medium text-primary"
          : "border-input text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function ReviewRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border px-4 py-3">
      <span className="text-sm text-muted-foreground">{k}</span>
      <span className="text-right text-sm font-medium">{v}</span>
    </div>
  );
}

export function GeneratingState({ destination }: { destination: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
      <p className="font-semibold">Building your relocation plan…</p>
      <p className="mt-1 max-w-[240px] text-sm text-muted-foreground">
        Phases, priorities and tasks for your move to{" "}
        {destination || "your new city"} are being prepared.
      </p>
      <PartyPopper className="mt-6 h-6 w-6 text-accent" />
    </div>
  );
}
