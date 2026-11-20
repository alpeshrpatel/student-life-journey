import type { IsoDate } from "../relocation/types.js";

const MS_PER_DAY = 86_400_000;

function formatInZone(nowMs: number, timeZone: string): IsoDate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowMs));
}

/** The calendar date at `nowMs` in `timeZone` (IANA name). `null` or an unknown zone means UTC. */
export function todayInTimeZone(nowMs: number, timeZone: string | null): IsoDate {
  if (timeZone === null) {
    return formatInZone(nowMs, "UTC");
  }
  try {
    return formatInZone(nowMs, timeZone);
  } catch (error) {
    if (error instanceof RangeError) {
      return formatInZone(nowMs, "UTC");
    }
    throw error;
  }
}

function toUtcMs(date: IsoDate): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year ?? Number.NaN, (month ?? Number.NaN) - 1, day ?? Number.NaN);
}

/** Whole calendar days from `from` to `to` (`to` minus `from`); negative when `to` is earlier. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

/** Whole days from today (in `timeZone`) to `arrivalDate`; 0 on the day, negative afterwards. */
export function daysUntilArrival(
  arrivalDate: IsoDate,
  nowMs: number,
  timeZone: string | null,
): number {
  return daysBetween(todayInTimeZone(nowMs, timeZone), arrivalDate);
}
