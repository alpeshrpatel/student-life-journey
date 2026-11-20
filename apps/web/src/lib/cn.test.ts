import { describe, expect, it } from "vitest";
import { cn } from "./cn.js";

describe("cn", () => {
  it("keeps a Tide font size next to a Tide text colour", () => {
    expect(cn("text-eyebrow text-on-selected")).toBe("text-eyebrow text-on-selected");
    expect(cn("text-control", "text-on-accent")).toBe("text-control text-on-accent");
  });

  it("still lets a later font size override an earlier one", () => {
    expect(cn("text-body", "text-title")).toBe("text-title");
  });

  it("still lets a later colour override an earlier one", () => {
    expect(cn("text-ink", "text-accent")).toBe("text-accent");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
