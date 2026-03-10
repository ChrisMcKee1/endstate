# Color Palette & Brand Style — Dark Mode

**This is the single source of truth for all colors and brand-specific styles.** To customize diagrams for your own brand, edit this file — everything else in the skill is universal.

**Theme: Dark Mode.** All shapes, text, and canvas are designed for a dark background. Light fills pop against the dark canvas; text is light by default.

---

## Canvas

| Property | Value |
|----------|-------|
| Canvas background | `#181926` |

This is set in `appState.viewBackgroundColor` in every `.excalidraw` file.

---

## Shape Colors (Semantic)

Colors encode meaning, not decoration. Each semantic purpose has a fill/stroke pair. Fills are saturated darks that glow against the canvas; strokes are brighter for definition.

| Semantic Purpose | Fill | Stroke | Text Inside |
|------------------|------|--------|-------------|
| Primary/Neutral | `#1e3a5f` | `#3b82f6` | `#e2e8f0` |
| Secondary | `#1e3a5f` | `#60a5fa` | `#e2e8f0` |
| Tertiary | `#1a2744` | `#93c5fd` | `#e2e8f0` |
| Start/Trigger | `#431407` | `#f97316` | `#fed7aa` |
| End/Success | `#052e16` | `#22c55e` | `#bbf7d0` |
| Warning/Reset | `#450a0a` | `#ef4444` | `#fecaca` |
| Decision | `#451a03` | `#f59e0b` | `#fef3c7` |
| AI/LLM | `#2e1065` | `#a78bfa` | `#ddd6fe` |
| Inactive/Disabled | `#1e293b` | `#475569` (dashed stroke) | `#94a3b8` |
| Error | `#450a0a` | `#dc2626` | `#fecaca` |

**Rule**: On a dark canvas, fills are deep/saturated darks. Strokes are the brighter accent that defines the shape edge. Text inside shapes uses the light pastel from the same color family.

---

## Text Colors (Hierarchy)

Free-floating text on the dark canvas uses light colors for readability.

| Level | Color | Use For |
|-------|-------|---------|
| Title | `#e2e8f0` | Section headings, major labels |
| Subtitle | `#93c5fd` | Subheadings, secondary labels |
| Body/Detail | `#94a3b8` | Descriptions, annotations, metadata |
| Semantic label | Match the stroke color of the element it describes | Phase labels, annotations near colored elements |

---

## Evidence Artifact Colors

Used for code snippets, data examples, and other concrete evidence inside technical diagrams.

| Artifact | Background | Text Color |
|----------|-----------|------------|
| Code snippet | `#0f172a` | Syntax-colored (language-appropriate) |
| JSON/data example | `#0f172a` | `#4ade80` (green) |
| Evidence stroke | `#334155` | — |

---

## Default Stroke & Line Colors

| Element | Color |
|---------|-------|
| Arrows | Use the stroke color of the source element's semantic purpose |
| Structural lines (dividers, trees, timelines) | `#475569` (slate) or match nearest semantic stroke |
| Dashed connector lines | `#475569` |
| Marker dots (fill + stroke) | Primary stroke (`#3b82f6`) |

---

## Cycle/Loop Arrows

| Purpose | Stroke | Style |
|---------|--------|-------|
| Cycle loop (back-edge) | `#ef4444` (red) | dashed, strokeWidth 2 |
