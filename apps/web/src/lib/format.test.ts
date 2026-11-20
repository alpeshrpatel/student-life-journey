import { describe, expect, it } from "vitest";
import { firstName, formatDate, formatDistance, formatMoney, greetingKey } from "./format.js";

describe("formatMoney", () => {
  it("AC2: drops the decimals for whole amounts", () => {
    expect(formatMoney(125000, "USD", "en-US")).toBe("$1,250");
  });

  it("AC2: keeps two decimals for fractional amounts", () => {
    expect(formatMoney(94950, "USD", "en-US")).toBe("$949.50");
  });

  it("AC2: handles a currency with no minor unit", () => {
    expect(formatMoney(1200, "JPY", "ja-JP")).toBe("￥1,200");
  });

  it("shows a dash for null", () => {
    expect(formatMoney(null, "USD", "en-US")).toBe("—");
  });

  it("formats zero and negative amounts", () => {
    expect(formatMoney(0, "USD", "en-US")).toBe("$0");
    expect(formatMoney(-125000, "USD", "en-US")).toBe("-$1,250");
    expect(formatMoney(-94950, "USD", "en-US")).toBe("-$949.50");
  });

  it("uses the locale's separators", () => {
    expect(formatMoney(123456, "EUR", "de-DE")).toBe("1.234,56\u00a0€");
  });
});

describe("formatDate", () => {
  it("AC3: formats a calendar date as a short weekday and day", () => {
    expect(formatDate("2026-11-16", "en-US")).toBe("Mon, Nov 16");
  });

  it("handles a leap day", () => {
    expect(formatDate("2028-02-29", "en-US")).toBe("Tue, Feb 29");
  });
});

describe("formatDistance", () => {
  it("formats metres below one kilometre", () => {
    expect(formatDistance(450, "metric", "en-US")).toBe("450 m");
    expect(formatDistance(80, "metric", "en-US")).toBe("80 m");
  });

  it("formats kilometres with one decimal", () => {
    expect(formatDistance(1800, "metric", "en-US")).toBe("1.8 km");
    expect(formatDistance(2000, "metric", "en-US")).toBe("2 km");
  });

  it("formats miles for imperial", () => {
    expect(formatDistance(480, "imperial", "en-US")).toBe("0.3 mi");
    expect(formatDistance(3200, "imperial", "en-US")).toBe("2 mi");
  });

  it("uses feet for very short imperial distances", () => {
    expect(formatDistance(60, "imperial", "en-US")).toBe("197 ft");
  });
});

describe("greetingKey", () => {
  it.each([
    [3, "greeting.upLate"],
    [9, "greeting.morning"],
    [14, "greeting.afternoon"],
    [20, "greeting.evening"],
  ] as const)("hour %i is %s", (hour, key) => {
    expect(greetingKey(hour)).toBe(key);
  });

  it("switches at 5, 12 and 18", () => {
    expect(greetingKey(4)).toBe("greeting.upLate");
    expect(greetingKey(5)).toBe("greeting.morning");
    expect(greetingKey(12)).toBe("greeting.afternoon");
    expect(greetingKey(18)).toBe("greeting.evening");
  });
});

describe("firstName", () => {
  it("returns the first word", () => {
    expect(firstName("Ada Lovelace")).toBe("Ada");
    expect(firstName("  Grace   Hopper ")).toBe("Grace");
  });

  it("returns an empty string for null or blank", () => {
    expect(firstName(null)).toBe("");
    expect(firstName("   ")).toBe("");
  });
});
