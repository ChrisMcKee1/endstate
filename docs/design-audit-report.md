# Design Audit Report — Endstate Dashboard

**Date:** March 13, 2026  
**Audit Type:** Full application audit (technical + design critique)  
**Overall Score:** 7.1 / 10

---

## Executive Summary

Endstate's dashboard has **strong bones and generic skin**. The underlying systems — agent color vocabulary, design tokens, animation architecture, celebration effects — are production-grade. But the visual execution relies on AI-era clichés (cyan-on-dark, glass morphism everywhere, default Next.js fonts, 10px text epidemic) that undermine what should be a premium, distinctive product.

The most critical structural issue is **hiding agent output behind graph node clicks** — the most important real-time content requires 2 clicks to access. This inverts the information hierarchy.

**94 technical findings** + **10 design categories rated** across 30+ components.

---

## Score Card

| Category | Score | Verdict |
|----------|-------|---------|
| AI Slop Detection | 6.5 | Has genuine elements but drowns in AI-era clichés |
| Visual Hierarchy | 7.5 | Good header/sidebar structure, but center-stage wastes space |
| Information Architecture | 7.0 | Logical grouping, but agent output is buried |
| Typography | 6.0 | Default font, no type scale, 10px text everywhere |
| Color & Composition | 7.5 | Strong palette system, but cyan = AI slop |
| States & Edge Cases | 7.5 | Good empty/loading/error states, missing skeletons |
| Emotional Resonance | 7.0 | Celebrations are great, but no urgency mode |
| Motion & Animation | 8.0 | Best category — springs, celebrations, consistent timing |
| Microcopy | 7.0 | Good contextual hints, unclear tab labels |
| Design Cohesion | 7.5 | Token system is solid, inconsistent container patterns |

---

## Strengths (Preserve These)

1. **Agent color system** — 15+ distinct agent identities centralized in `agent-visuals.ts`. Used consistently across all components. Don't fragment.
2. **CelebrationEffects** — Reducer-based state management with semantically meaningful triggers (first fix, convergence, clean sweep). Rarity-tiered achievement badges with shimmer effects.
3. **Logo SVG** — Animated draw-in with semantic meaning (E → infinity loop → diamond = vision → iteration → outcome). Most distinctive visual element.
4. **Spring physics** — Consistent stiffness/damping profiles across all interactive elements. Gives the app a cohesive physical feel.
5. **Design token system** — Comprehensive `@theme inline` block with surfaces, borders, agents, severities, statuses, shadows, glows. Components actually use tokens.
6. **ErrorBoundary** — Shake animation, retry button, real error display without jargon.
7. **MarkdownRenderer** — Memo'd, dual component maps (normal/compact), module-scope plugins. Exemplary implementation.
8. **ProjectKnowledge** — Proper ARIA, AbortController cleanup, three clear states (empty/view/edit).
9. **WorkflowGraph DAG** — Custom-built from real data, not a library chart. Dynamic topology.
10. **Steering bar intelligence** — Contextual placeholder text + quick chips that teach the interaction model.

---

## Consolidated Findings

### CRITICAL (6 findings)

| # | Finding | Component | Category | Skill |
|---|---------|-----------|----------|-------|
| C1 | Agent output hidden behind graph clicks — most important content requires 2 clicks | Dashboard, WorkflowGraph | UX/IA | distill + bolder |
| C2 | No responsive design — dashboard breaks on mobile/tablet | All components | Responsive | adapt |
| C3 | Missing focus trap in modals — keyboard users can tab outside | TaskDetail, AgentChatPanel, Settings | Accessibility | harden |
| C4 | Form inputs missing associated labels | SettingsPanel, SetupWizard, SteeringBar | Accessibility | harden |
| C5 | No skip-navigation links | Layout | Accessibility | harden |
| C6 | 15+ icon-only buttons missing aria-label | Dashboard header, various panels | Accessibility | harden |

### HIGH (13 findings)

| # | Finding | Component | Category | Skill |
|---|---------|-----------|----------|-------|
| H1 | #00E5FF cyan accent = AI dashboard cliché | globals.css, all components | Anti-pattern | colorize |
| H2 | Geist Sans is default Next.js font — no distinctiveness | layout.tsx | Anti-pattern | bolder |
| H3 | 50+ hardcoded hex colors in component files (not tokens) | 15+ components | Theming | normalize |
| H4 | 50+ inline style={{}} with static color values | Dashboard, WorkflowGraph, etc. | Theming | normalize |
| H5 | 10px text epidemic — readability issues, no type scale | Nearly all components | Typography | normalize + polish |
| H6 | ThemeProvider sets data-theme but CSS vars don't respond | ThemeProvider, globals.css | Theming | normalize |
| H7 | Missing useEffect cleanup (AbortController) in some fetch components | Multiple | Performance | optimize |
| H8 | Missing keyboard handlers on clickable divs | Multiple | Accessibility | harden |
| H9 | Silent API error catches with no user feedback | Multiple | UX | harden + clarify |
| H10 | No prefers-reduced-motion support | Logo, CelebrationEffects, WorkflowGraph | Accessibility | animate |
| H11 | No skeleton screens for loading states | MetricsBar, TaskList, ModelSelector | UX | onboard |
| H12 | Glass morphism overuse — every surface same treatment | All panels | Anti-pattern | distill |
| H13 | Color-only status indicators (no text/icon fallback for colorblind) | WorkflowGraph, TaskList | Accessibility | harden |

### MEDIUM (42 findings — grouped by pattern)

#### Typography & Text (8 findings)
| # | Finding | Components | Skill |
|---|---------|------------|-------|
| M1 | `uppercase tracking-widest` pattern repeated 50+ times | All labels | normalize |
| M2 | Missing display font for brand identity | Header, Logo | bolder |
| M3 | No meaningful type scale between 10px and 14px | All | normalize |
| M4 | Text overflow not addressed on small viewport widths | Task titles, agent names | harden |
| M5 | "Intel" tab label is unclear — should be "Knowledge" or "Research" | Dashboard | clarify |
| M6 | "Vision" tab label is ambiguous | Dashboard | clarify |
| M7 | "CTX", "TSK-001", "ANALYST:BE" — developer jargon in UI | Multiple | clarify |
| M8 | Missing tooltips on icon-only header buttons | Dashboard header | clarify |

#### Layout & Responsive (6 findings)
| # | Finding | Components | Skill |
|---|---------|------------|-------|
| M9 | WorkflowGraph uses ~60% viewport height when mostly static | Dashboard | distill + adapt |
| M10 | Fixed sidebar width (360px) with no collapse option | Dashboard | adapt |
| M11 | 6 sidebar tabs is too many — Awards and Vision could be secondary | Dashboard | distill |
| M12 | Settings and Git are hidden behind small icon buttons | Dashboard header | clarify |
| M13 | AgentChatPanel slides over — 3 different panels compete for same space | Dashboard | distill |
| M14 | Steering bar mode switch is implicit (based on isRunning) | SteeringBar | clarify |

#### Theming & Colors (10 findings)
| # | Finding | Components | Skill |
|---|---------|------------|-------|
| M15 | 30+ hardcoded rgba() values for borders/glows/backgrounds | Multiple | normalize |
| M16 | Tailwind arbitrary color values like `bg-[#00E5FF]` | Multiple | normalize |
| M17 | 15+ SVG stroke colors hardcoded | WorkflowGraph, Logo | normalize |
| M18 | Low-alpha everything — UI feels faint and washed out | All glass panels | colorize |
| M19 | No warm color element — entire palette is cool-toned | globals.css | colorize |
| M20 | Four accent colors compete equally (cyan/violet/emerald/amber) | globals.css | colorize |
| M21 | WorkflowGraph container uses inline style instead of token | WorkflowGraph | normalize |
| M22 | DOMAIN_COLORS object hardcodes hex values | WorkflowGraph | normalize |
| M23 | Award rarity colors hardcoded | AwardsPanel | normalize |
| M24 | Diff colors hardcoded | FileDiffPreview, TaskDetail | normalize |

#### Performance (6 findings)
| # | Finding | Components | Skill |
|---|---------|------------|-------|
| M25 | Some components not wrapped in memo() that should be | Multiple list items | optimize |
| M26 | Missing useMemo() on filtered/sorted lists | TaskList, MetricsBar | optimize |
| M27 | Objects created inside render creating new references | Multiple | optimize |
| M28 | Heavy inline SVG in WorkflowGraph could be optimized | WorkflowGraph | optimize |
| M29 | Unused CSS keyframe animations (defined but never applied) | globals.css | distill |
| M30 | Framer Motion bundle impact not assessed | All animated components | optimize |

#### States & Interactions (7 findings)
| # | Finding | Components | Skill |
|---|---------|------------|-------|
| M31 | No urgency mode when critical tasks exist | Dashboard | animate + harden |
| M32 | Task deletion has no undo | TaskList | harden |
| M33 | Pipeline start has 15s timeout but no "taking longer than expected" message | Dashboard | clarify |
| M34 | No empty state guidance in some panels | MetricsBar, ContextMeter | onboard |
| M35 | Modal Escape key conflicts (multiple listeners without stopPropagation) | TaskDetail, Settings, Git | harden |
| M36 | Side panels don't have proper focus management on open/close | Settings, Git, AgentChat | harden |
| M37 | StartNewModal Resume vs New Vision lacks clear visual hierarchy | StartNewModal | clarify |

#### Design System (5 findings)
| # | Finding | Components | Skill |
|---|---------|------------|-------|
| M38 | UI guidelines.md describes themes/fonts that don't exist in code | docs/ | normalize |
| M39 | CSS defines theme variants (CRT, Pip-Boy) but none are functional | globals.css | normalize |
| M40 | No reusable Button component — buttons are ad-hoc everywhere | All | extract |
| M41 | No reusable Modal/Dialog component — modals are built per-component | TaskDetail, Settings, etc. | extract |
| M42 | No reusable Badge component — severity/status badges are inline | TaskList, TaskDetail, etc. | extract |

### LOW (33 findings — grouped)

#### Polish & Consistency (12 findings)
| # | Finding | Skill |
|---|---------|-------|
| L1-L4 | Inconsistent button padding across components | polish |
| L5-L8 | Inconsistent border-radius usage (rounded-lg vs rounded-xl) | polish |
| L9-L12 | Inconsistent transition durations (150ms/200ms/300ms/500ms) | polish |

#### Optimization (8 findings)
| # | Finding | Skill |
|---|---------|-------|
| L13-L16 | Missing key= props or non-unique keys in some lists | optimize |
| L17-L20 | console.log/warn statements in production code | distill |

#### Nice-to-haves (13 findings)
| # | Finding | Skill |
|---|---------|-------|
| L21-L24 | Unused animation CSS classes could be removed | distill |
| L25-L28 | Some components could benefit from stagger animations on mount | animate |
| L29-L33 | Various spelling/grammar in microcopy | clarify |

---

## Systemic Patterns

These recurring issues require systematic, codebase-wide fixes rather than per-component patches:

1. **Hardcoded colors** — 50+ instances of hex/rgba in TS/TSX files. MUST be migrated to design tokens or Tailwind classes. This is the single most impactful normalize task.

2. **10px text everywhere** — The `text-[10px]` pattern appears in virtually every component for labels, badges, and metadata. Need a typography audit and minimum size policy (11px for labels, 13px for body).

3. **No focus indicators** — Custom interactive elements (tabs, clickable cards, icon buttons) lack `:focus-visible` styling. Every clickable element needs a visible focus ring.

4. **Glass morphism as default** — `glass-panel` or inline glass styles on every container. Need to distinguish between elevated (glass) and static (solid surface) containers.

5. **Silent error handling** — Multiple `catch (() => {})` blocks that swallow errors without user feedback. Every failed API call should show a toast/alert.

6. **No responsive design** — Zero breakpoint usage. Dashboard is fixed-viewport only. Adding even basic responsive behavior is a major effort.

---

## Phased Remediation Plan

### Phase 1: Foundation (Critical + Structural)
**Goal:** Fix accessibility blockers, establish design system foundations, extract reusable components.

| Task | Skill | Est. Files |
|------|-------|-----------|
| Extract reusable Button, Modal/Dialog, Badge components | extract | +3 new components |
| Migrate all hardcoded colors to design tokens | normalize | ~20 component files |
| Fix ThemeProvider CSS var connection | normalize | globals.css, ThemeProvider |
| Add aria-labels to all icon-only buttons | harden | ~10 components |
| Add focus traps to all modals | harden | TaskDetail, AgentChatPanel, Settings |
| Add skip-navigation link | harden | layout.tsx |
| Associate form inputs with labels | harden | Settings, SetupWizard, SteeringBar |
| Add keyboard handlers to clickable divs | harden | Multiple |
| Fix silent error handlers | harden + clarify | Multiple |

### Phase 2: Accessibility & Performance
**Goal:** WCAG AA compliance, performance optimization, responsive foundations.

| Task | Skill | Est. Files |
|------|-------|-----------|
| Add prefers-reduced-motion support | animate | Logo, CelebrationEffects, WorkflowGraph |
| Add color-blind-safe fallbacks (text/icon alongside color) | harden | WorkflowGraph, TaskList |
| Add skeleton screens for loading states | onboard | MetricsBar, TaskList, ModelSelector |
| Optimize memo/useMemo/useCallback usage | optimize | ~10 components |
| Add AbortController cleanup to all fetches | optimize | ~8 components |
| Establish minimum touch target sizes (44px) | adapt | All interactive elements |
| Fix unclear tab labels (Intel→Knowledge, Vision→Inspiration) | clarify | Dashboard |
| Add tooltips to icon-only buttons | clarify | Dashboard header |
| Fix microcopy jargon | clarify | Multiple |

### Phase 3: Design Quality
**Goal:** Elevate visual personality, fix AI slop tells, establish typography.

| Task | Skill | Est. Files |
|------|-------|-----------|
| Replace cyan accent (#00E5FF) with distinctive alternative | colorize | globals.css |
| Replace Geist Sans with distinctive font (JetBrains Mono or similar) | bolder | layout.tsx, globals.css |
| Establish proper type scale (11/13/15/18px) | normalize | ~20 components |
| Reduce glass morphism — reserve for elevated elements only | distill | ~15 components |
| Add warm color element to palette | colorize | globals.css |
| Reduce sidebar to 4-5 tabs | distill | Dashboard |
| Add urgency mode (visual shift for critical tasks) | animate + harden | Dashboard |
| Reduce uppercase tracking-widest pattern | normalize | ~15 components |

### Phase 4: Delight & Polish
**Goal:** Final refinement, personality, polish.

| Task | Skill | Est. Files |
|------|-------|-----------|
| Add stagger animations to list mounts | animate | TaskList, MetricsBar |
| Improve empty state guidance | onboard | MetricsBar, ContextMeter |
| Add display font for brand name | bolder | Header, Logo |
| Fix inconsistent button padding/border-radius | polish | All buttons |
| Fix inconsistent transition durations | polish | All animated elements |
| Add undo for task deletion | delight | TaskList |
| Remove unused CSS keyframes and dead code | distill | globals.css |
| Update UI guidelines.md to match reality | normalize | docs/ |

### Phase 5: Validation
- Re-run full technical audit
- Re-run design critique
- Compare before/after scores
- Document remaining items

---

## Component Quality Rankings

| Rating | Components |
|--------|-----------|
| 9/10 | MarkdownRenderer, ThemeProvider, ProjectKnowledge |
| 8/10 | SteeringBar, MetricsBar, AgentStream, TaskList, ErrorBoundary, Logo |
| 7/10 | Dashboard, WorkflowGraph, AwardsPanel, CelebrationEffects, TaskDetail, SetupWizard |
| 6/10 | ContextMeter, TokenUsageDisplay |

---

*Next step: Begin Phase 1 execution with extract + normalize + harden skills.*
