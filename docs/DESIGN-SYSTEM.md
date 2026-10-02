# Design system — "Engineered editorial"

## Discovery: what the logo gives us

The logo files in `src/assets/brand/source/` were analysed programmatically
(pixel sampling) and visually:

| Element | Observation | Translated into |
|---|---|---|
| Background | Cool near-black, `#050608`–`#0C0D0F` | The ink scale; dark is the brand theme (a light theme is available, see below) |
| "A" mark | Two steel legs, white → `#D1DAE5` gradient, sharp cuts | Steel text colours; sharp corners; 45°/60° diagonals |
| Blade | Orange sweep `#FE6E02` replacing the crossbar | The single signal colour, used sparingly |
| Circuit traces | 45° routed lines ending in **ring nodes** | The Atlaxys signature motif: trace + node |
| Wordmark | Extended heavy grotesk, orange "X" (`#FF8828`) | Display type: Archivo at 122% width, weight 760; the orange "×" as a marker |
| "CONSULTING" | Light, widely tracked caps | Mono metadata labels, uppercase and tracked |

The logo itself is never redrawn: `scripts/brand-assets.mjs` only crops it,
removes its flat background and places it on canvases (favicons, OG image).
For light backgrounds it also writes `atlaxys-wordmark-ink.png`, the same
lockup with its white/steel letters in ink; the orange X and every shape are
untouched.

## Colour tokens (`src/styles/tokens.css`)

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--brand-ink` / `--ink-950` | `#08090B` | page background | — |
| `--ink-900 … --ink-700` | `#0D0F12` → `#262B32` | surfaces, raised panels | — |
| `--steel-50` | `#F2F4F7` | primary text on dark | 18:1 |
| `--steel-200` | `#C3CBD5` | secondary text | 12:1 |
| `--steel-400` | `#8D97A4` | muted text | 6.7:1 |
| `--steel-600` | `#6B7480` | UI borders, decorative only | 4.2:1 |
| `--signal-500` (brand) | `#FF8828` | accents, primary buttons (ink text) | 8.3:1 on ink; ink on it 8.1:1 |
| `--signal-600` | `#FE6E02` | active states, glows | — |
| `--signal-ink` | `#A84200` | orange text on light surfaces | ≥ 4.6:1 on every paper surface |
| `--paper-50 … --paper-400` | `#F7F8FA` → `#C3CBD5` | light surfaces (light theme, paper sections) | — |
| `--paper-ink` / `-ink-2` / `-muted` | `#11141A` / `#323843` / `#525A66` | text on paper | 16.3:1 / 10.4:1 / 6.2:1 on `--paper-100` |

Semantic roles (`--color-bg`, `--color-surface` … `-4`, `--color-text`,
`--color-text-2`, `--color-muted`, `--color-line`, `--color-accent`,
`--color-primary`, `--color-focus`, `--color-danger`, `--color-trace`,
`--shadow-*`, …) are what components use. Never reference the raw `--ink-*`,
`--steel-*` or `--paper-*` scales from a component: that is what kept a
colour from following the theme.

## Themes: dark and light

| Context | Selector | Look |
|---|---|---|
| Dark (default, the brand) | `:root`, `[data-theme="dark"]` | ink page, steel text, glowing orange signal |
| Light | `[data-theme="light"]` on `<html>` | cool blue-grey paper (`#EEF1F5`), softened ink text, burnt-orange accents (`--signal-ink`); orange buttons keep ink text |
| Paper section in dark mode | `[data-theme="light"]` on a section | the light palette, as a band |
| Paper section in light mode | `[data-theme="light"] [data-theme="light"]` | one step deeper (`--paper-150`) so bands still read as bands |
| Always dark | `data-theme="dark"` on an element | e.g. the logo panel on the About page |

*Easy on the eyes:* the light theme avoids pure white and pure black on large
areas (less glare, less halation); body text stays ≥ 13:1 on every surface and
every pair passes WCAG AA (checked with axe on all pages, both themes).

**How it switches.** An inline script at the top of `BaseLayout.astro` sets
`<html data-theme>` before the first paint (no flash): the visitor's stored
choice (`localStorage['atlaxys-theme']`), else `site.theme.default` in
`src/config/site.ts` (`'system'` follows the device setting; `'dark'` or
`'light'` forces one for first visits). `ThemeToggle.astro` (header and
landing header) is a toggle button named "Dark mode"; `src/scripts/core/theme.ts`
stores the choice only when it differs from the default, follows device
changes live while nothing is stored, syncs other tabs, updates the browser
UI colour, and reveals the new theme as a circle from the button (View
Transitions API; instant with reduced motion or older browsers). The WebGL
hero listens for the `atlaxys:themechange` event: additive glow on dark,
normal "ink" blending on light, colours from `--color-trace` / `--trace-gain`.

**Logo.** `Logo.astro` renders both files; `--logo-on-dark` / `--logo-on-light`
show the one that suits the surface it sits on.

**To change the brand colours**, edit the *Brand* block only.

## Typography

| Role | Font | Settings |
|---|---|---|
| Display | Archivo (variable) | `font-stretch: 122%`, weight 760, tracking −0.025em, leading 0.94–1.0 |
| Text | Archivo | normal width, 400/500/600, leading 1.55 |
| Mono labels | JetBrains Mono | 500, uppercase, 0.08em tracking — indices, specs, metadata |
| Arabic | Noto Kufi Arabic | display 700, no tracking, no uppercase, leading 1.3–1.8 |

Fluid scale: `--step--2` … `--step-5` and `--step-hero`, from 360px to 1440px.
Fonts are self-hosted from npm (`@fontsource-variable/*`) with
`unicode-range` subsets; the Latin Archivo file is preloaded and a
metric-matched Arial fallback minimises layout shift.

## Space, grid, shape

- Space: `--space-3xs` (4px) → `--space-3xl` (104px); sections use
  `--space-section` (72–160px fluid).
- Container: 1440px max, fluid gutter 16–48px; 12-column grid utility.
- Shape: square corners. The **chamfer** (`--chamfer`, 12px; `--chamfer-lg`, 22px)
  — a 45° cut from the circuit traces — marks primary buttons, media frames,
  product cards and CTA panels. Mirrored in RTL.
- Hairlines (`--color-line`) instead of shadows; shadows only for overlays.

## Signature motifs

- **Signal trace + node** (`SignalRule.astro`): eyebrows, dividers, nav hover,
  hero underline, process rail, architecture connectors.
- **Blueprint grid** (`.bg-grid`): faint engineering grid behind heroes,
  media placeholders and diagrams.
- **Spec sheets** (`SpecList`, `TechStack`): mono labels + values — the voice
  of engineering documentation.
- **Orange ×**: the wordmark's X, reused as the "things we refuse to do" and
  problem-list marker.

## Components (selection)

| Component | Notes |
|---|---|
| `Button` | `primary` (orange fill, chamfer), `secondary` (hairline, chamfer), `link` (trace underline); `magnetic` option; focus ring never clipped |
| `SectionHeader` | index + trace eyebrow, display title (line reveal), intro column, action slot |
| `ServiceIndex` | big editorial rows; hover routes a trace across the row |
| `MediaFrame` | chamfered frame + crop marks; designed placeholder when no image |
| `BlueprintCover` | generates a case-study cover from its own architecture layers |
| `ArchitectureDiagram` | accessible HTML diagram (ordered list of layers) |
| `Accordion` | native `<details name>` exclusive accordion |
| `Modal` | native `<dialog>` (focus trap, Esc, inert background) |
| `LeadForm` | accessible form with error summary, states, `full`/`compact` |
| `Tag` | mono chip, status variants (available / beta / in development / coming soon) |

## Motion language

- Easing: `--ease-signal` `cubic-bezier(0.7,0,0.2,1)` for traces and wipes
  (precise, engineered); `--ease-out` `cubic-bezier(0.16,1,0.3,1)` for arrivals.
- Durations: 120 / 220 / 420 / 800 / 1200 ms.
- Vocabulary: things **arrive in reading order**, **traces route in**,
  **signals travel along traces**, media **wipes open** along the reading
  direction. No bouncing, no spinning, no parallax on text.
- Reduced motion: everything static and instant.

## Breakpoints

`30rem` (480) · `48rem` (768) · `64rem` (1024 — desktop nav, pinned process,
WebGL) · `80rem` (1280). Mobile-specific solutions: full-screen dialog
navigation, vertical process timeline, SVG hero, sticky conversion bar on
landing pages, ≥16px inputs (no iOS zoom), 44px touch targets.
