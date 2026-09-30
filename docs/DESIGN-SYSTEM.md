# Design system — "Engineered editorial"

## Discovery: what the logo gives us

The logo files in `src/assets/brand/source/` were analysed programmatically
(pixel sampling) and visually:

| Element | Observation | Translated into |
|---|---|---|
| Background | Cool near-black, `#050608`–`#0C0D0F` | The ink scale; a dark-first site |
| "A" mark | Two steel legs, white → `#D1DAE5` gradient, sharp cuts | Steel text colours; sharp corners; 45°/60° diagonals |
| Blade | Orange sweep `#FE6E02` replacing the crossbar | The single signal colour, used sparingly |
| Circuit traces | 45° routed lines ending in **ring nodes** | The Atlaxys signature motif: trace + node |
| Wordmark | Extended heavy grotesk, orange "X" (`#FF8828`) | Display type: Archivo at 122% width, weight 760; the orange "×" as a marker |
| "CONSULTING" | Light, widely tracked caps | Mono metadata labels, uppercase and tracked |

The logo itself is never redrawn: `scripts/brand-assets.mjs` only crops it,
removes its flat background and places it on canvases (favicons, OG image).

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
| `--signal-ink` | `#B04400` | orange text on light surfaces | 5.1:1 |
| Light "paper" | `#F2F4F7` / `#FFFFFF` | `data-theme="light"` sections | ink text 17.5:1 |

Semantic roles (`--color-bg`, `--color-surface`, `--color-text`,
`--color-text-2`, `--color-muted`, `--color-line`, `--color-accent`,
`--color-primary`, `--color-focus`, `--color-danger`, …) are what components
use. `[data-theme="light"]` re-maps them, so any section can switch to paper.

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
