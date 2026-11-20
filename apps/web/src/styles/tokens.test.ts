// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

const SEMANTIC_COLOURS = [
  "ground",
  "surface",
  "ink",
  "ink-secondary",
  "ink-tertiary",
  "accent",
  "accent-hover",
  "accent-pressed",
  "on-accent",
  "selected",
  "on-selected",
  "urgent",
  "urgent-tint",
  "urgent-tint-strong",
  "on-urgent",
  "on-urgent-strong",
  "urgent-edge",
  "track",
  "marker-muted",
  "rule",
  "control",
].map((name) => `--color-${name}`);

function block(start: string): string {
  const open = css.indexOf(start);
  expect(open, `block "${start}" exists`).toBeGreaterThanOrEqual(0);
  const end = css.indexOf("\n}", open);
  return css.slice(open, end);
}

describe("Tide tokens", () => {
  const theme = block("@theme {");
  const dark = block('[data-theme="dark"] {');

  it.each(SEMANTIC_COLOURS)("defines %s in the @theme block", (name) => {
    expect(theme).toContain(`${name}:`);
  });

  it.each(SEMANTIC_COLOURS)("overrides %s in the dark block", (name) => {
    expect(dark).toContain(`${name}:`);
  });

  it("removes Tailwind's default colours, radii and shadows", () => {
    expect(theme).toContain("--color-*: initial;");
    expect(theme).toContain("--radius-*: initial;");
    expect(theme).toContain("--shadow-*: initial;");
  });

  it("uses the reference light values for ground and ink", () => {
    expect(theme).toContain("--color-ground: #f2f5f4;");
    expect(theme).toContain("--color-ink: #1d2b2a;");
  });

  it("has no Tailwind default palette entry", () => {
    expect(css).not.toContain("--color-red-500");
  });
});
