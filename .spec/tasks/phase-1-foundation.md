# Phase 1 — Foundation

**Owner:** Backend agent
**Skills:** `copilot-sdk`, `next-best-practices`

## Project Scaffold

- [ ] Initialize Next.js with TypeScript and Tailwind CSS (`next.config.ts`, `tsconfig.json`, `tailwind.config.ts`)
- [ ] Install core dependencies: `@github/copilot-sdk`, `zod`, `canvas-confetti`, `opentelemetry` packages
- [ ] Create `src/app/layout.tsx` — root layout with global fonts and metadata
- [ ] Create `src/app/page.tsx` — placeholder dashboard page
- [ ] Create `src/app/setup/page.tsx` — placeholder setup wizard page

## Core Types (`src/lib/types.ts`)

- [ ] `Task` interface — id, title, severity, status, component, cycle, files, tags, timeline, timestamps
- [ ] `TaskEvent` interface — agent, action, timestamp, cycle, detail, expected, actual, reasoning, diff, buildResult, screenshot, otelTraceId
- [ ] `PipelineConfig` interface — projectPath, appUrl, inspiration, maxCycles, model, autoApprove, infiniteSessions, fixSeverity, agent toggles
- [ ] `AgentRole` type — "explorer" | "analyst" | "fixer" | "ux-reviewer"
- [ ] `PipelineState` interface — status, currentCycle, activeAgent, tasks summary
- [ ] `SteeringMessage` interface — message, timestamp, id
- [ ] `SessionEvent` union type for SSE forwarding

## Copilot SDK Singleton (`src/lib/copilot/client.ts`)

- [ ] `CopilotClient` singleton — lazy initialization, start/stop lifecycle
- [ ] `getClient()` export — returns or creates the singleton
- [ ] `listModels()` pass-through to surface model metadata
- [ ] State management — track connected/disconnected/error

## Agent Session Factory (`src/lib/copilot/agents.ts`)

- [ ] `createAgentSession(role, config)` — creates a session per agent role
- [ ] System prompt loading from `src/lib/copilot/instructions/{role}.md`
- [ ] MCP server configuration per role (Playwright for Explorer/UX, Filesystem for Analyst/Fixer, GitHub for Fixer)
- [ ] Hook wiring — `onPreToolUse`, `onPostToolUse`, `onUserPromptSubmitted`
- [ ] Infinite sessions config pass-through
- [ ] Permission auto-approve handler

## Agent System Prompts (`src/lib/copilot/instructions/`)

- [ ] `explorer.md` — Navigate app, exercise user flows, create Task objects, retest regressions
- [ ] `analyst.md` — Cross-reference findings with code, assign severity, diagnose root causes
- [ ] `fixer.md` — Apply fixes, verify builds, commit to branches, revert on failure
- [ ] `ux-reviewer.md` — Evaluate from user perspective, score UX categories, flag issues

## Custom Tools (`src/lib/copilot/tools.ts`)

- [ ] `create_task` — Agent creates a new Task object
- [ ] `update_task` — Agent updates an existing task (status, timeline events)
- [ ] `list_tasks` — Agent retrieves current task summaries
- [ ] `check_app_health` — Verify target application is running

## Task Store (`src/lib/pipeline/task-store.ts`)

- [ ] In-memory task map
- [ ] `createTask()`, `updateTask()`, `getTask()`, `getAllTasks()`, `getTasksByStatus()`
- [ ] JSON file persistence — write to `data/tasks/{task-id}.json`
- [ ] Load existing tasks from disk on startup

## Orchestrator Skeleton (`src/lib/pipeline/orchestrator.ts`)

- [ ] Cycle loop: Explorer → Analyst → Fixer → UX Reviewer → convergence check
- [ ] Configurable agent enablement (skip disabled agents)
- [ ] Severity threshold for Fixer (only fix at/above configured level)
- [ ] Convergence query to Analyst (CONTINUE/STOP)
- [ ] Max cycles hard stop
- [ ] Event emitter for pipeline state changes

## Steering Queue (`src/lib/pipeline/steering.ts`)

- [ ] FIFO queue for developer steering messages
- [ ] `enqueue(message)`, `dequeue()`, `peek()`, `isEmpty()`
- [ ] Hook into `onUserPromptSubmitted` to inject steering

## Verification

- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` passes
- [ ] One full cycle against a test project (terminal output)
