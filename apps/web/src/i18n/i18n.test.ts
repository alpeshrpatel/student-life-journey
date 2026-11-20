import { ErrorCodeSchema } from "@slj/contracts";
import { describe, expect, it } from "vitest";
import { i18n, SUPPORTED_LOCALES } from "./index.js";

describe("i18n", () => {
  it("resolves common keys", () => {
    expect(i18n.t("app.tagline")).toBe("Know what to do next.");
    expect(i18n.t("placeholder.notFound")).toBe("We can't find that page.");
  });

  it("supports English only for now", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en"]);
    expect(i18n.language).toBe("en");
  });

  it("AC4: every ErrorCode has a non-empty sentence in errors.json", () => {
    for (const code of ErrorCodeSchema.options) {
      const sentence = i18n.t(code, { ns: "errors" });
      expect(sentence, code).not.toBe(code);
      expect(sentence.length, code).toBeGreaterThan(0);
    }
  });

  it("returns the key for an unknown error code (so a gap is visible)", () => {
    expect(i18n.t("NOPE", { ns: "errors" })).toBe("NOPE");
  });
});
