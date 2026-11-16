# ADR-0013 — Design system approach

**TL;DR**
1. The supplied "Modernist / Tide" design is the visual source of truth.
2. Its `:root` token block is copied verbatim into `apps/web/src/styles/tokens.css` and mapped to Tailwind CSS 4 utilities with `@theme inline`.
3. Components are our own code in `apps/web/src/ui`, built on Radix primitives where accessibility is hard (dialog, toast), and styled only with tokens.
4. Icons are Lucide; the font is Archivo, self-hosted.
5. Reversal cost S–M; runner-up is React Aria Components.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Design Lead, Tech Lead hats |
| Supersedes | Indigo shadcn-style theme in `legacy/prototype/src/app/globals.css` and `legacy/prototype/tailwind.config.ts`; emoji priority markers in `legacy/prototype/src/lib/client.ts` |
| Related | ADR-0012, `07_UX_DESIGN_SYSTEM.md` |

## Context

The design artifact defines: ground `#f2f5f4`, surface `#e6ecea`, ink `#1d2b2a`, teal accent `#226a66` for action and selection, amber `#e0a53a` for urgency, no red anywhere, 2–4 px radius, 2 px rules instead of cards, flush-left labels (including inside buttons), Lucide icons, Archivo 400/600/800. It ships component classes (`.btn`, `.tag`, `.input`, `.seg`, `.card`, `.table`, `.dialog`) and two interactive frames (mobile 390 with bottom tabs, desktop 1280 with a sidebar). It is light-only; a dark theme is derived in `07_UX_DESIGN_SYSTEM.md`.

## Decision drivers

1. Fidelity to the Tide design (weight 3).
2. Accessibility of complex widgets (weight 3).
3. Weak-model familiarity (weight 3).
4. Theming, including dark mode (weight 2).
5. Bundle size (weight 1).

## Options

Scores 1–5; maximum weighted total 60.

| Option | Fidelity | A11y | Weak-model | Theming | Bundle | Total |
|---|---|---|---|---|---|---|
| A. Keep the indigo shadcn-style theme (do nothing) | 1 | 4 | 5 | 3 | 4 | 40 |
| **B. Tide tokens + Tailwind 4 + own components on Radix** | 5 | 5 | 4 | 5 | 4 | **56** |
| C. Material UI | 2 | 5 | 4 | 4 | 2 | 43 |
| D. The design's own `styles.css` classes, no Tailwind | 5 | 2 | 3 | 3 | 5 | 41 |
| E. Tamagui or NativeWind (cross-platform primitives) | 3 | 3 | 2 | 4 | 3 | 35 |
| F. Tide tokens + Tailwind 4 + React Aria Components | 5 | 5 | 3 | 5 | 4 | 53 |

## Decision

1. **Tokens.** `apps/web/src/styles/tokens.css` holds one Tailwind `@theme { … }` block with the design's values under semantic names (`ground`, `surface`, `ink`, `accent`, `selected`, `urgent-tint`, `rule`, `control`, …) plus a `[data-theme="dark"]` block that overrides the same variables (S-R2-012). The block first resets Tailwind's default colours, radii and shadows (`--color-*: initial` and so on), so utilities such as `bg-red-500` or `rounded-xl` do not exist. `apps/web/src/styles/app.css` imports Tailwind and the token file. Resulting utilities: `bg-ground`, `bg-surface`, `text-ink`, `text-ink-secondary`, `bg-accent`, `text-on-accent`, `bg-selected`, `text-on-selected`, `bg-urgent-tint`, `text-on-urgent`, `border-rule`, `border-control`, `rounded-sm|md|lg`. The exact files are in `07_UX_DESIGN_SYSTEM.md` §5 and S-R0-017.
2. **No raw values.** Components use token utilities only; the design's 100–900 ramps are not exposed, so every component works in both themes. ESLint forbids hex colours in `apps/web/src` (S-R0-017). The colour red is not in the palette.
3. **Components.** One file per component in `apps/web/src/ui`, shadcn-style: `class-variance-authority` for variants, `cn()` from `clsx` + `tailwind-merge`, native elements first (`<button>`, `<input>`, `<label>`, `<fieldset>`). Radix is used for `Dialog` and `Toast` only in R1. The inventory with props and states is in `07_UX_DESIGN_SYSTEM.md` §6.
4. **Tide rules that are easy to break and are therefore tested:** button labels flush left when the button is wider than its label; selected segmented options use tint + bottom bar, never a solid fill; amber never appears without an icon or a word; one solid-accent block per screen; checkboxes and priority markers are square.
5. **Icons and font.** `lucide-react`; `@fontsource-variable/archivo` imported once in `main.tsx` so no request goes to Google Fonts (privacy, offline shells).
6. **Layout.** Mobile-first; bottom tabs below 1024 px, sidebar from 1024 px; navigation defined once in `apps/web/src/app/navigation.ts`.
7. **`apps/site`** imports the same `tokens.css` by relative path; no component sharing.

## Consequences

**Good:** the design can be retuned in one file; components are plain React that weak models can read; no runtime styling library.

**Bad:** we write and test about 20 components ourselves; Radix default behaviours must be restyled to the square, ruled look.

**Neutral:** the design frames show features that ship later (Life Readiness, My Life, map, routes); `07_UX_DESIGN_SYSTEM.md` §3 states which blocks render in which release.

## Reversal cost

**S–M.** Tokens are framework-neutral; components would be rewritten.

## Flip trigger

Adopt React Aria Components (option F) for a widget if an accessibility audit (S-R2-014) finds a Radix-based or hand-written widget failing WCAG 2.2 AA twice.

## References

- Design artifact files `styles.css`, `readme.md`, `SLJ App.dc.html`.
- https://tailwindcss.com/docs/theme ; `00_PROGRESS_LOG.md` §3.5.
