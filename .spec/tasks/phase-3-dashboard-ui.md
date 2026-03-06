# Phase 3 — Dashboard UI

**Owner:** Frontend agent
**Skills:** `frontend-design`, `next-best-practices`, `next-cache-components`

## Layout & Theme System

- [ ] Root layout (`src/app/layout.tsx`) — global fonts (distinctive, not generic), CSS variables for theming
- [ ] Centralized theme with CSS custom properties — dark mode default, gamification color palette
- [ ] Award-winning aesthetic: bold colors, purposeful motion, spatial depth, not generic AI slop
- [ ] Fixed viewport dashboard — no page scroll, internal panel scrolling
- [ ] Responsive breakpoints — desktop-first, graceful tablet adaptation

## Dashboard Page (`src/app/page.tsx`)

- [ ] Redirect to `/setup` when no active pipeline config
- [ ] Main dashboard layout — header, workflow graph, split content, steering bar
- [ ] SSE connection hook — real-time event consumption

## SSE Client Hook (`src/hooks/useSSE.ts`)

- [ ] `useSSE(url)` — connect to `/api/pipeline/stream`
- [ ] Auto-reconnect on disconnect
- [ ] Parse structured JSON events
- [ ] Expose: events array, connection status, latest event per type
- [ ] Clean disconnect on unmount

## Header Component

- [ ] Project name, model badge, cycle counter, LIVE/PAUSED indicator
- [ ] Settings gear icon → opens SettingsPanel
- [ ] Compact, information-dense

## Workflow Graph (`src/components/WorkflowGraph.tsx`)

- [ ] SVG visualization: Explorer → Analyst → Fixer → UX Reviewer → loop-back arrow
- [ ] Active node pulses with glow animation
- [ ] Completed nodes fill with success color
- [ ] Animated edges showing flow direction
- [ ] Cycle counter display

## Agent Stream (`src/components/AgentStream.tsx`)

- [ ] Live scrolling output — auto-scroll to bottom, pause on user scroll-up
- [ ] Color-coded by agent (Explorer=blue, Analyst=purple, Fixer=green, UX=amber)
- [ ] Tagged lines with agent name, timestamp, event type
- [ ] Tool invocation entries with expandable args/results
- [ ] Streaming token display (character by character)

## Steering Bar (`src/components/SteeringBar.tsx`)

- [ ] Fixed to bottom of viewport — NEVER moves
- [ ] Text input + send button
- [ ] Quick-action chips: "Skip to UX review", "Focus on errors", "Run security checks", "Test mobile", "Increase cycles"
- [ ] POST to `/api/pipeline/steer` on send
- [ ] Visual feedback on message sent

## Task List (`src/components/TaskList.tsx`)

- [ ] Sortable/filterable by severity, status, cycle, component
- [ ] Severity badges: CRITICAL=red, HIGH=orange, MEDIUM=yellow, LOW=blue
- [ ] Status indicators with icons
- [ ] Click to open TaskDetail modal
- [ ] Task count summary header

## Task Detail (`src/components/TaskDetail.tsx`)

- [ ] Modal overlay with task header (ID, title, severity, status, cycle)
- [ ] Files list with language icons
- [ ] Agent timeline — vertical timeline, colored nodes per agent, expandable entries
- [ ] Detail/expected/actual/reasoning/diff per timeline entry
- [ ] OTel trace link per entry (if available)

## UX Scorecard (`src/components/UxScorecard.tsx`)

- [ ] Score bars per UX category (navigation, errors, empty states, language, accessibility)
- [ ] Overall score with visual treatment (golden glow if > 7/10)
- [ ] Trend indicator if multiple cycles
- [ ] Adoption verdict display

## Model Selector (`src/components/ModelSelector.tsx`)

- [ ] Dropdown populated from `/api/models`
- [ ] Show: model name, vendor icon, max tokens, billing multiplier
- [ ] Capability badges: vision, reasoning effort
- [ ] Selected model highlight

## Settings Panel (`src/components/SettingsPanel.tsx`)

- [ ] Slide-out or modal panel
- [ ] Max cycles slider
- [ ] Severity threshold selector
- [ ] Agent toggle switches (Explorer, Analyst, Fixer, UX Reviewer)
- [ ] Auto-approve toggle
- [ ] Infinite sessions toggle
- [ ] Save → POST to `/api/settings`

## Context Meter (`src/components/ContextMeter.tsx`)

- [ ] Per-session gauge (0-100%)
- [ ] Color gradient: green < 50%, yellow 50-75%, orange 75-90%, red > 90%
- [ ] Animated pulse during compaction events
- [ ] Current tokens / max tokens label

## Metrics Bar (`src/components/MetricsBar.tsx`)

- [ ] Tokens consumed (per agent, color-coded)
- [ ] Avg response latency
- [ ] Tasks: created/resolved/open counts
- [ ] Build pass/fail ratio bar
- [ ] Cycles completed counter

## Verification

- [ ] Dashboard renders with mock data
- [ ] All components typed with no `any`
- [ ] SSE hook connects and displays events
- [ ] Fixed viewport — no page scroll
- [ ] `npm run build` succeeds
