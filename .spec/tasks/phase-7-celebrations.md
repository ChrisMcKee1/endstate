# Phase 7 — Celebrations + Polish

**Owner:** Frontend agent (celebrations, UX) + Backend agent (error handling, session resume)
**Skills:** `frontend-design`, `copilot-sdk`, `next-best-practices`

## Celebration Effects (`src/components/CelebrationEffects.tsx`)

- [ ] Install and integrate `canvas-confetti`
- [ ] Milestone triggers (from orchestrator SSE events):

| Milestone | Effect |
|-----------|--------|
| First task resolved | Small confetti burst |
| All CRITICAL tasks resolved | Full-screen confetti |
| UX avg > 7/10 | Golden glow on UX panel |
| Zero open tasks | Full celebration + banner "All Clear!" |
| Pipeline converges (STOP) | Sparkle effect + completion badge |
| Build passes | Green flash on Fixer workflow node |
| Build fails | Red shake on Fixer workflow node |

- [ ] Gamification score display — points earned for resolved tasks, clean builds, UX improvements
- [ ] Achievement badges — "First Fix", "Clean Sweep", "UX Champion", "Zero Bugs", "Speed Demon"
- [ ] Sound effects option (toggle in settings) — subtle celebration sounds
- [ ] Celebration history — "Achievements" panel showing earned milestones

## Error Boundaries

- [ ] React error boundary wrapping each major panel (stream, tasks, metrics)
- [ ] Graceful fallback UI — "Something went wrong" with retry button
- [ ] Error reporting to console with context

## Graceful Degradation

- [ ] CLI missing — detect on startup, show install instructions
- [ ] Target app down — handle in Explorer/UX Reviewer, create task instead of crashing
- [ ] Network failure — SSE auto-reconnect with exponential backoff
- [ ] Model unavailable — fallback suggestion in model selector

## Session Resume

- [ ] On app restart, check for persisted sessions via `client.listSessions()`
- [ ] Offer "Resume" option in dashboard with session summary
- [ ] Rehydrate task store from `data/tasks/` JSON files
- [ ] Restore pipeline state from last known position

## Keyboard Shortcuts

- [ ] `Ctrl+Enter` — Send steering message
- [ ] `Escape` — Close modals
- [ ] `Ctrl+S` — Save settings
- [ ] `Ctrl+1/2/3/4` — Switch between right panel tabs
- [ ] `Space` — Pause/resume pipeline
- [ ] Help overlay (`?`) showing all shortcuts

## Accessibility

- [ ] Proper ARIA labels on interactive elements
- [ ] Focus management in modals
- [ ] Keyboard navigation through task list
- [ ] Screen reader announcements for pipeline state changes

## README

- [ ] Project overview and purpose
- [ ] Prerequisites (Node.js, GitHub Copilot CLI)
- [ ] Installation and setup
- [ ] Usage guide with screenshots
- [ ] Architecture overview
- [ ] Configuration reference
- [ ] Contributing guidelines

## Verification

- [ ] Celebration effects trigger correctly
- [ ] Error boundaries catch and display errors gracefully
- [ ] Session resume works after app restart
- [ ] All keyboard shortcuts functional
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
