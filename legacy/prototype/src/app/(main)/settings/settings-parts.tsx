"use client";

export const TRANSPORT = ["PUBLIC_TRANSIT", "WALKING", "BIKE", "CAR", "RIDESHARE"];
export const TRANSPORT_LABELS: Record<string, string> = {
  PUBLIC_TRANSIT: "🚌 Transit",
  WALKING: "🚶 Walking",
  BIKE: "🚲 Bike",
  CAR: "🚗 Car",
  RIDESHARE: "🚕 Rideshare",
};
export const INTEREST_LABELS: Record<string, string> = {
  FOOD: "🍜 Food",
  OUTDOORS: "🌲 Outdoors",
  FITNESS: "🏋️ Fitness",
  ARTS: "🎨 Arts",
  NIGHTLIFE: "🌃 Nightlife",
  TECH: "💻 Tech",
  GAMING: "🎮 Gaming",
  STUDY_SPOTS: "📚 Study spots",
  MUSIC: "🎵 Music",
  SPORTS: "⚽️ Sports",
};

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function Chips({
  options,
  active,
  onToggle,
}: {
  options: { value: string; label: string }[];
  active: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onToggle(o.value)}
          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
            active.includes(o.value)
              ? "border-primary bg-primary/10 font-semibold text-primary"
              : "border-input text-muted-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
