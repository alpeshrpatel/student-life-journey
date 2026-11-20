"use client";

/** Tiny typed fetch wrapper for the app's own BFF API. */
export async function api<T>(
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<T> {
  const res = await fetch(path, {
    method: options?.method ?? (options?.body ? "POST" : "GET"),
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const PRIORITY_META: Record<
  string,
  { emoji: string; label: string; className: string }
> = {
  CRITICAL: { emoji: "🔴", label: "Critical", className: "text-red-600" },
  HIGH: { emoji: "🟠", label: "High", className: "text-orange-500" },
  MEDIUM: { emoji: "🟡", label: "Medium", className: "text-yellow-500" },
  LOW: { emoji: "⚪️", label: "Low", className: "text-slate-400" },
};

export const PHASE_LABELS: Record<string, string> = {
  BEFORE_ARRIVAL: "Before arrival",
  FIRST_24_HOURS: "First 24 hours",
  FIRST_7_DAYS: "First 7 days",
  ONGOING: "Ongoing settling",
};

export function formatMoneyClient(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatDistanceClient(meters: number | null | undefined): string {
  if (meters == null) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

