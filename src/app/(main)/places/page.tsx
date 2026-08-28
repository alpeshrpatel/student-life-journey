"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, MapPin } from "lucide-react";
import { api, formatDistanceClient } from "@/lib/client";
import { StateCard } from "../dashboard/parts";

const CATEGORIES = [
  { value: "GROCERY", label: "Grocery", emoji: "🛒" },
  { value: "PHARMACY", label: "Pharmacy", emoji: "💊" },
  { value: "HEALTHCARE", label: "Healthcare", emoji: "🏥" },
  { value: "TRANSIT", label: "Transit", emoji: "🚇" },
  { value: "LAUNDRY", label: "Laundry", emoji: "🧺" },
] as const;

interface PlaceResult {
  externalId: string;
  name: string;
  category: string;
  address: string;
  distanceMeters: number;
  mapsUrl: string;
  source: string;
}

interface PlacesResponse {
  anchorLabel: string;
  source: "google_places" | "demo";
  results: PlaceResult[];
}

export default function PlacesPage() {
  const [category, setCategory] = useState<string>("GROCERY");
  const [data, setData] = useState<PlacesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (cat: string) => {
    setLoading(true);
    try {
      setData(
        await api<PlacesResponse>(`/api/places/essential?categories=${cat}`),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load places");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(category);
  }, [category, load]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Essential places</h1>
        {data && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            Near {data.anchorLabel}
          </p>
        )}
      </div>

      {data?.source === "demo" && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800">
          🧪 Demo mode — these are labeled sample results. Add a
          GOOGLE_MAPS_API_KEY to see real live places.
        </p>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategory(c.value)}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
              category === c.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-card text-muted-foreground"
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {error ? (
        <StateCard title="Something went wrong" message={error} retry={() => void load(category)} />
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !data || data.results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No results found nearby.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {data.results.map((place) => (
            <li key={place.externalId}>
              <a
                href={place.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-lg">
                  {CATEGORIES.find((c) => c.value === place.category)?.emoji ?? "📍"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{place.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {place.address}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-medium text-primary">
                    ~{formatDistanceClient(place.distanceMeters)}
                    {place.source === "demo" ? " · sample" : ""}
                  </span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
