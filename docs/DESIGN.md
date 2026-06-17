# Crafted Warmth Design System

UI design guide for the NM Truth Commission Tracker. The goal is **crafted warmth** — systematic, editorial, and restrained — not vibe-coded warmth (swap background, round corners, done).

## Principles

### Color

Use a **warm neutral ramp** in one hue family. Depth comes from value shifts between canvas, surface, and surface-muted — not gray drop shadows.

| Token | Hex | Use |
|-------|-----|-----|
| `--canvas` | `#F7F3ED` | Page background |
| `--surface` | `#EDE7DC` | Cards, sections |
| `--surface-muted` | `#E2DACE` | Nested panels, code, hover states |
| `--border` | `#D4CCC0` | Hairline 1px rules |
| `--border-strong` | `#C4BAB0` | Hover borders, button outlines |
| `--text` | `#1A1714` | Primary text (warm near-black) |
| `--text-body` | `color-mix(80% muted, 20% text)` ≈ `#5A544A` | Readable body paragraphs |
| `--text-muted` | `#6B6358` | Labels, secondary UI copy |
| `--accent` | `#B87A5C` | Desaturated clay — scarce |
| `--accent-muted` | `#C9A08A` | Focus rings, subtle interactive states |

**Do:** flat color blocks, 1px warm borders, chromatic neutrals  
**Don't:** stacked shadows, glassmorphism, gradients on everything, cool grays (`stone-*`)

### Typography

| Role | Font | Tailwind |
|------|------|----------|
| Display (headlines) | Newsreader | `font-display` (via `h1–h3` or explicit) |
| UI / body | Source Sans 3 | `font-sans` |

**Scale (1.25 ratio):** `text-xs` (12px) → `text-sm` (15px) → `text-base` (19px) → `text-lg` (24px) → `text-xl` (30px) → `text-2xl` (38px) → `text-3xl` (48px)

**Headlines:** large, `tracking-[-0.02em]` to `tracking-[-0.03em]`, tight leading (`leading-[1.05]`–`1.15`)  
**Body:** `leading-relaxed` (1.5–1.6), mixed weights (400/500/600) — not bold-only emphasis  
**Copy:** curly quotes, em dashes, ligatures enabled globally

Licensed upgrades (swap via `@font-face`, keep token names): Tiempos/Canela + Söhne/Untitled Sans.

### Space

- Outer margin: `px-[var(--margin-page)]` — `clamp(1.5rem, 5vw, 5rem)`
- Asymmetric grids: `md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]`
- Body text: `max-w-prose` (~65ch) even in wide layouts
- Uneven vertical rhythm: `mt-12`, `mt-20` — not uniform spacing

### Texture & depth

- Optional `.grain` overlay on page root (subtle noise, ~3.5% opacity)
- Radius: **4px everywhere** via `--radius` / `rounded-sm`
- No default 8–12px rounding on every element

### Motion & focus

- Transitions: `200ms cubic-bezier(0.4, 0, 0.2, 1)` — use `.transition-base`
- Focus: `2px solid var(--accent-muted)`, `outline-offset: 2px`

### Images (Block C+)

Apply `.img-warm` for consistent treatment: `sepia(0.15) saturate(0.9)`.

---

## Accent budget

Before shipping any page:

1. Count decorative uses of `--accent` / `text-accent` / `bg-accent`
2. **Max 2 per viewport** (above the fold)
3. Focus/hover with `--accent-muted` does not count toward the decorative budget

Example (homepage): accent on one stat number + one source link = 2 touches.

---

## Tailwind classes

Prefer semantic tokens over raw palette utilities:

```
bg-canvas bg-surface bg-surface-muted
text-text text-body text-muted text-accent
border-border border-border-strong
font-sans font-display
rounded-sm transition-base
```

**Never use** `stone-*`, `amber-*`, `gray-*` for UI surfaces in new work.

---

## Components

Located in `apps/web/src/components/ui/`:

| Component | Purpose |
|-----------|---------|
| `PageLayout` | Canvas shell, grain, page margins |
| `SiteHeader` | Asymmetric header with serif title |
| `StatTile` | Metric display; `highlight` for the one accent stat |
| `LinkCard` | Neutral hover link card |

Use `prose-block` for body paragraphs with warm link styling.

---

## File reference

| File | Role |
|------|------|
| `apps/web/src/app/globals.css` | Token definitions, base styles, utilities |
| `apps/web/src/app/layout.tsx` | Font loading |
| `docs/DESIGN.md` | This document |

---

## Checklist (do / don't)

| Do | Don't |
|----|-------|
| Warm chromatic neutrals in one hue family | Flat `#F5F5F0` or cool `stone-950` |
| Serif display + humanist sans | Inter, Geist, Arial fallback |
| Modular type scale (1.25) | Three arbitrary font sizes |
| Asymmetric grid, wide margins | Center everything uniformly |
| Accent ~2× per viewport | Amber on every label, stat, and hover |
| 4px radius consistently | Mixed `rounded-xl` / `rounded-2xl` |
| 200ms eased transitions | Instant or slow hovers |
| Edited copy with proper punctuation | `&apos;` and straight quotes in UI |
