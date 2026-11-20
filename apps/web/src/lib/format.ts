const MS_PER_FOOT = 3.28084;
const METERS_PER_MILE = 1609.344;

/** Formats money held in minor units. `null` is "—"; whole amounts drop the decimals. */
export function formatMoney(amountMinor: number | null, currency: string, locale: string): string {
  if (amountMinor === null) {
    return "—";
  }
  const digits = new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits;
  const divisor = 10 ** (digits ?? 2);
  const whole = amountMinor % divisor === 0;
  const fractionDigits = whole ? 0 : digits;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amountMinor / divisor);
}

/** Formats a calendar date (`YYYY-MM-DD`) without time-zone shifts, e.g. "Mon, Nov 16". */
export function formatDate(isoDate: string, locale: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? Number.NaN, (month ?? Number.NaN) - 1, day ?? Number.NaN));
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** "450 m", "1.8 km", "0.3 mi" (feet below a tenth of a mile). */
export function formatDistance(
  meters: number,
  units: "metric" | "imperial",
  locale: string,
): string {
  const oneDecimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const whole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  if (units === "metric") {
    return meters < 1000 ? `${whole.format(meters)} m` : `${oneDecimal.format(meters / 1000)} km`;
  }
  const miles = meters / METERS_PER_MILE;
  return miles < 0.1
    ? `${whole.format(meters * MS_PER_FOOT)} ft`
    : `${oneDecimal.format(miles)} mi`;
}

export type GreetingKey =
  "greeting.upLate" | "greeting.morning" | "greeting.afternoon" | "greeting.evening";

export function greetingKey(hour: number): GreetingKey {
  if (hour < 5) return "greeting.upLate";
  if (hour < 12) return "greeting.morning";
  if (hour < 18) return "greeting.afternoon";
  return "greeting.evening";
}

export function firstName(name: string | null): string {
  if (name === null) {
    return "";
  }
  return name.trim().split(/\s+/)[0] ?? "";
}
