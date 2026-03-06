# Phase 4 — Setup Wizard + Project Detection

**Owner:** Frontend agent (UI) + Backend agent (detection logic)
**Skills:** `frontend-design`, `next-best-practices`, `copilot-sdk`

## Setup Wizard Component (`src/components/SetupWizard.tsx`)

- [ ] Multi-step wizard with progress indicator and step transitions
- [ ] Award-winning visual design — gamified, engaging, not a boring form

### Step 1: Project Path

- [ ] **Native folder picker** — `<input type="file" webkitdirectory>` or Electron-style dialog
- [ ] Display selected path with folder icon
- [ ] Auto-detect project type from contents (show detected tech stack badges)
- [ ] Empty folder detection → "Build from scratch" mode indicator
- [ ] Existing project detection → "Iterate & improve" mode indicator

### Step 2: Inspiration & Scenarios

- [ ] Large rich text area for describing what to build / who it's for
- [ ] Scenario templates / starter prompts the user can click to populate:
  - "Review this app, find flaws, and fix everything"
  - "Build a modern web app from scratch based on my description"
  - "Improve the UX and accessibility of this existing app"
  - "Find and fix all security vulnerabilities"
  - "Refactor for performance and code quality"
  - Custom scenario
- [ ] Guiding principles input — optional structured fields for priorities
- [ ] Support for pointing at existing APIs, platforms, multi-project repos
- [ ] Preview of how inspiration flows to agents

### Step 3: Model Selection

- [ ] Model dropdown from `/api/models` with full metadata display
- [ ] Vendor icons, token limits, billing multiplier, capability badges
- [ ] Recommended model highlight

### Step 4: Pipeline Settings

- [ ] Max cycles (1-50) with slider
- [ ] Severity threshold selector (CRITICAL / HIGH / MEDIUM / LOW)
- [ ] Agent toggles with descriptions (Explorer, Analyst, Fixer, UX Reviewer)
- [ ] Auto-approve toggle with explanation
- [ ] Infinite sessions toggle

### Step 5: Confirmation & Start

- [ ] Summary card of all configuration
- [ ] "Start Pipeline" button with engaging animation
- [ ] Persist config to `.agentic-dev.json` via `/api/settings`
- [ ] Redirect to dashboard on start

## Project Detection Logic (Backend)

- [ ] `detectProjectType(path)` — scan for config files
  - `package.json` → Node.js/TypeScript (check for framework: Next.js, React, Vue, Angular, etc.)
  - `*.csproj` / `*.sln` → .NET
  - `requirements.txt` / `pyproject.toml` → Python
  - `go.mod` → Go
  - `Cargo.toml` → Rust
  - `pom.xml` / `build.gradle` → Java/Kotlin
  - Multiple project types → Multi-project/Monorepo detection
  - Empty folder → Greenfield
- [ ] `detectRunningApp(url)` — health check at provided URL
- [ ] Return structured detection result with badges for UI

## Config Persistence

- [ ] `POST /api/settings` persists to `.agentic-dev.json` in target project root
- [ ] `GET /api/settings` loads from `.agentic-dev.json`
- [ ] Merge with defaults for missing fields
- [ ] Validate with zod schema

## Verification

- [ ] Wizard renders all 5 steps with smooth transitions
- [ ] Folder picker opens native dialog
- [ ] Project detection correctly identifies at least Node.js, .NET, Python
- [ ] Config persists and loads across page refreshes
- [ ] Start redirects to dashboard with pipeline running
