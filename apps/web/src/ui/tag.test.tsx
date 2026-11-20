import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Tag } from "./tag.js";

describe("Tag", () => {
  it.each([
    ["accent", ["bg-selected", "text-on-selected"]],
    ["urgent", ["bg-urgent-tint", "text-on-urgent"]],
    ["neutral", ["bg-surface", "text-ink-secondary"]],
    ["outline", ["border", "border-accent", "text-accent"]],
  ] as const)("AC4: %s tone uses its token classes", (tone, classes) => {
    render(<Tag tone={tone}>Label</Tag>);
    expect(screen.getByText("Label")).toHaveClass(...classes, "text-eyebrow", "rounded-sm");
  });

  it("defaults to the neutral tone and merges className", () => {
    render(<Tag className="extra">Plain</Tag>);
    expect(screen.getByText("Plain")).toHaveClass("bg-surface", "extra");
  });

  it("AC4: neither primitive's source contains a hex colour", () => {
    for (const file of ["./tag.tsx", "./button.tsx"]) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});
