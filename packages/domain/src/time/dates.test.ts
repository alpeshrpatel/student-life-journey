import { describe, expect, it } from "vitest";
import { IsoDateSchema, TimeOfDaySchema } from "../relocation/types.js";
import { daysBetween, daysUntilArrival, todayInTimeZone } from "./dates.js";

describe("daysBetween", () => {
  it("is 0 for the same day", () => {
    expect(daysBetween("2026-11-04", "2026-11-04")).toBe(0);
  });

  it("counts forward", () => {
    expect(daysBetween("2026-11-04", "2026-11-16")).toBe(12);
  });

  it("is negative backward", () => {
    expect(daysBetween("2026-11-16", "2026-11-04")).toBe(-12);
  });

  it("counts across a leap day", () => {
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
    expect(daysBetween("2027-02-28", "2027-03-01")).toBe(1);
  });

  it("is not affected by daylight-saving change days", () => {
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
    expect(daysBetween("2026-10-31", "2026-11-02")).toBe(2);
  });
});

describe("todayInTimeZone", () => {
  const justAfterMidnightUtc = Date.UTC(2026, 10, 5, 3, 0);

  it("returns the UTC date for UTC", () => {
    expect(todayInTimeZone(justAfterMidnightUtc, "UTC")).toBe("2026-11-05");
  });

  it("returns the previous day in America/Phoenix", () => {
    expect(todayInTimeZone(justAfterMidnightUtc, "America/Phoenix")).toBe("2026-11-04");
  });

  it("returns the next day in Asia/Kolkata late in the UTC evening", () => {
    expect(todayInTimeZone(Date.UTC(2026, 10, 5, 20, 0), "Asia/Kolkata")).toBe("2026-11-06");
  });

  it("falls back to UTC for null", () => {
    expect(todayInTimeZone(justAfterMidnightUtc, null)).toBe("2026-11-05");
  });

  it("falls back to UTC for an invalid zone and does not throw", () => {
    expect(() => todayInTimeZone(justAfterMidnightUtc, "Not/AZone")).not.toThrow();
    expect(todayInTimeZone(justAfterMidnightUtc, "Not/AZone")).toBe("2026-11-05");
  });
});

describe("daysUntilArrival", () => {
  const nowMs = Date.UTC(2026, 10, 5, 3, 0);

  it("uses the destination zone (still 4 November in Phoenix)", () => {
    expect(daysUntilArrival("2026-11-16", nowMs, "America/Phoenix")).toBe(12);
  });

  it("is 11 in UTC for the same instant", () => {
    expect(daysUntilArrival("2026-11-16", nowMs, "UTC")).toBe(11);
  });

  it("is 0 on the arrival day", () => {
    expect(daysUntilArrival("2026-11-05", nowMs, "UTC")).toBe(0);
  });

  it("is negative after arrival", () => {
    expect(daysUntilArrival("2026-11-01", nowMs, "UTC")).toBe(-4);
  });
});

describe("IsoDateSchema", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(IsoDateSchema.safeParse("2026-01-05").success).toBe(true);
  });

  it("rejects 2026-1-5", () => {
    expect(IsoDateSchema.safeParse("2026-1-5").success).toBe(false);
  });
});

describe("TimeOfDaySchema", () => {
  it("accepts 23:59 and 00:00", () => {
    expect(TimeOfDaySchema.safeParse("23:59").success).toBe(true);
    expect(TimeOfDaySchema.safeParse("00:00").success).toBe(true);
  });

  it("rejects 24:00", () => {
    expect(TimeOfDaySchema.safeParse("24:00").success).toBe(false);
  });
});
