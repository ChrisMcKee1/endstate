# Copilot Instructions — Agentic Application Development

## Project Overview

An autonomous development tool that uses the **GitHub Copilot SDK (TypeScript)** to orchestrate specialized AI agents in a continuous feedback loop. Agents explore, analyze, fix, and evaluate any target application through **Playwright**, **Filesystem**, and **GitHub MCP servers**, surfacing results in a real-time **Next.js dashboard**.

**Not a testing framework.** This is an autonomous development partner that finds issues, fixes them, and keeps iterating until the app converges on stability and usability.

## Tech Stack

| Layer | Choice |
|-------|--------|
| SDK | `@github/copilot-sdk` (TypeScript) |
| Frontend | Next.js 16+ · React · Tailwind CSS |
| Real-time | Server-Sent Events (SSE) |
| Backend | Next.js API Routes (co-located) |
| Observability | OpenTelemetry (traces + metrics) |
| State | In-memory + JSON file persistence (`.projects/<slug>/tasks/`) |
| Browser automation | Playwright MCP Server |
| Code access | Filesystem MCP Server |
| Git integration | GitHub MCP Server |

## Architecture & Key Concepts

### Copilot SDK Patterns
- **One `CopilotClient` singleton** (`src/lib/copilot/client.ts`) — manages the CLI connection.
- **One session per agent** — Explorer, Analyst, Fixer, UX Reviewer each get an isolated session with their own system prompt, tools, and MCP servers.
- **Session hooks** (`onPreToolUse`, `onPostToolUse`, `onUserPromptSubmitted`) are where OTel instrumentation and developer steering injection live.
- **Custom tools** use `defineTool` from `@github/copilot-sdk` with `zod` schemas.
- **Infinite sessions** enabled by default — the SDK handles context compaction transparently.
- **Session persistence** allows resume across app restarts via `client.resumeSession()`.

### Pipeline
- The **orchestrator** (`src/lib/pipeline/orchestrator.ts`) runs cycles: Explorer → Analyst → Fixer → UX Reviewer → convergence check → loop or stop.
- **Task objects** are the central data model — every finding, diagnosis, fix, and verification is a `TaskEvent` appended to a task's timeline.
- **Steering** from the developer injects via `onUserPromptSubmitted` hook, appending `[DEVELOPER STEERING]: {message}` to the next agent prompt.
- **Convergence** is decided by the Analyst: CONTINUE or STOP based on unresolved critical/high tasks.

### Four Agent Roles
| Agent | MCP Servers | Purpose |
|-------|------------|---------|
| Explorer | Playwright | Navigate the running app, exercise user flows, create task objects |
| Analyst | Filesystem | Cross-reference findings with code, assign severity, diagnose root causes |
| Fixer | Filesystem, GitHub, shell | Apply code fixes, verify builds, commit to branches, revert on failure |
| UX Reviewer | Playwright | Evaluate from a non-technical user perspective, score UX categories |

### Project Knowledge (Cheat Sheet)
- The **Researcher agent** runs once at pipeline start and produces a project cheat sheet.
- The cheat sheet is **not a task** — it's a persistent knowledge artifact stored separately.
- Stored in-memory + persisted to `.projects/<slug>/cheat-sheet.md` (survives restarts).
- **Injected into all downstream agent system prompts** via `loadSystemPrompt()` in `agents.ts`.
- Editable at any time via the **Intel tab** in the dashboard sidebar (`/api/knowledge` CRUD).
- Uses delimited markers (`---CHEAT-SHEET-START---` / `---CHEAT-SHEET-END---`) for extraction.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx / page.tsx          # Dashboard
│   ├── setup/page.tsx                 # Setup wizard
│   └── api/
│       ├── pipeline/{start,stop,steer,stream}/route.ts
│       ├── knowledge/route.ts         # Cheat sheet CRUD (GET/POST/PUT/DELETE)
│       ├── models/route.ts
│       ├── tasks/route.ts
│       └── settings/route.ts
├── lib/
│   ├── copilot/                       # SDK singleton, session factory, tools
│   │   ├── agents/                    # Markdown system prompts per agent role
│   │   └── prompts/                   # Shared base prompt (_base.md)
│   ├── pipeline/                      # Orchestrator, task store, cheat-sheet-store, steering
│   ├── otel/                          # OTel setup, spans, metrics
│   └── types.ts                       # Task, TaskEvent, PipelineConfig interfaces
├── components/
│   ├── MarkdownRenderer.tsx           # Reusable markdown renderer (memo'd, themed)
│   ├── ProjectKnowledge.tsx           # Intel tab — cheat sheet view/edit/delete
│   ├── Dashboard.tsx                  # Main coordinator with sidebar tabs
│   └── ...                            # WorkflowGraph, AgentStream, TaskList, etc.
├── hooks/
│   └── useSSE.ts                      # SSE subscription hook
docs/                                  # Developer documentation (use subfolders by topic)
.projects/                             # Per-project data (tasks, config, cheat-sheet) — gitignored
```

## Coding Conventions

### TypeScript
- Strict mode. No `any` — use the interfaces from `types.ts`.
- Prefer `async/await` over raw promises.
- Use `zod` for tool parameter validation and all external input.
- Named exports only; no default exports except Next.js pages/layouts.

### Simplicity & Native Types (CRITICAL)
- **Use native SDK return types directly.** Do not wrap types from `@github/copilot-sdk`, OpenTelemetry, Playwright, or Next.js in custom adapter classes or DTOs. If the SDK gives you a type, use that type.
- **No unnecessary wrappers or delegation layers.** If a function only forwards to another function without adding logic, delete it and call the target directly.
- **One level of indirection maximum.** If you must abstract, one layer is enough. Two layers of wrapping is a code smell.
- **No factories for single-use patterns.** If a builder/factory is called once, inline the construction.
- **Prefer `as const` objects + derived union types over scattered string literals.** Centralized values propagate changes; string literals require find-and-replace.
- **Hoist static data** to module-level constants instead of allocating per function call.
- **Elegant simplicity over clever engineering.** The simplest code that works correctly is the best code. Over-engineering is a defect.

### Next.js
- **Server Components by default.** Add `"use client"` only when the component needs browser APIs, event handlers, or React state.
- Use `next/image` and `next/font` — never raw `<img>` tags.
- API routes return `NextResponse.json()` with appropriate status codes.
- SSE streams use `ReadableStream` in route handlers.

### React
- Use `memo()` for components that receive stable props but live under frequently re-rendering parents (e.g., stream entries, markdown renders).
- Use `useMemo()` for expensive computations (markdown parsing, filtered lists).
- Use `useCallback()` for event handlers passed as props to prevent child re-renders.
- Use `useTransition()` for non-urgent async mutations (save/delete) to keep the UI responsive.
- Use callback refs (not `setTimeout`) for focus management after conditional renders.
- Use `AbortController` with `useEffect` cleanup for all fetch calls to prevent state updates on unmounted components.
- Hoist static objects (animation variants, component maps, plugins arrays) to **module scope** — never allocate inside render.
- Add proper ARIA attributes: `role="region"`, `aria-label`, `aria-modal`, `role="alert"` for errors.

### Frontend
- Tailwind utility classes — no CSS modules, no styled-components.
- Dashboard layout is **fixed viewport, no page scroll**. Individual panels scroll internally.
- Use `canvas-confetti` for celebration effects (milestones, convergence).
- Prefer bold, intentional design over generic AI aesthetics (see `frontend-design` skill).
- **Markdown rendering**: Use `MarkdownRenderer` component for all agent-generated content. It uses Endstate design tokens (not generic styles). Pass `compact` for stream/chat contexts.
- **Theming**: All components must use design tokens from `globals.css` (`text-text-primary`, `bg-overlay`, `border-border-subtle`, `text-accent`, `bg-glass-cyan`, `shadow-elevation-1`, etc.). Never use raw hex colors in components.

### Documentation
- **All developer documentation lives in `docs/`.** When writing or updating docs, place them here — not in the repo root or scattered across `src/`.
- **Use subfolders to organize by topic.** Group related docs under directories (e.g., `docs/architecture/`, `docs/guides/`, `docs/api/`). Don't dump everything flat into `docs/`.
- **Keep docs current.** When you add a feature, change an API, or modify architecture, update the relevant doc in the same PR. Stale docs are worse than no docs.
- **Diagrams over walls of text.** Use the `excalidraw-diagram-skill` to create `.excalidraw` diagrams that visually argue architecture, data flow, pipeline stages, and system interactions. Diagrams should be committed alongside the docs they support (e.g., `docs/architecture/pipeline-flow.excalidraw`).
- **Excalidraw for visualization.** When documenting architecture, agent workflows, data flow, or system design, generate Excalidraw diagrams to make the concepts tangible. Diagrams should *argue* — show relationships, causality, and flow that prose alone can't convey. Use the skill's visual pattern library (fan-out, convergence, timeline, assembly line) to match diagram structure to conceptual structure.
- **Reference diagrams from markdown.** Link to `.excalidraw` files from the markdown docs so readers know visual references exist.

### State & Persistence
- Task store is in-memory with JSON file persistence to `.projects/<slug>/tasks/{task-id}.json`.
- Cheat sheet store is in-memory + `.projects/<slug>/cheat-sheet.md` on disk (write-through cache).
- Pipeline config persists to `.projects/<slug>/config.json` (and mirrored to `.agentic-dev.json` in the target project root).
- Project resolution via `src/lib/pipeline/project-resolver.ts` — handles slugging, active project tracking, and legacy migration.
- No database. No ORM.

### OpenTelemetry
- Every agent turn, tool invocation, task mutation, and compaction event emits a span.
- Metrics: token counters per agent, task created/resolved counters, build pass/fail, UX scores.
- Traces export to OTLP endpoint (configurable, defaults to `localhost:4318`).

## Build & Run

```bash
npm install              # Install dependencies
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
```

Requires **GitHub Copilot CLI** installed and authenticated (`copilot --version`).

## Important Patterns

### Tool Definition
```typescript
import { defineTool } from "@github/copilot-sdk";
import { z } from "zod";

const myTool = defineTool("tool_name", {
  description: "What this tool does",
  parameters: z.object({ /* ... */ }),
  handler: async (params) => { /* return JSON-serializable result */ },
});
```

### Session Creation
```typescript
const session = await client.createSession({
  model: "claude-opus-4.6",
  streaming: true,
  systemMessage: { content: agentPrompt },
  tools: [customTools],
  mcpServers: { /* playwright, fs, github */ },
  infiniteSessions: { enabled: true },
  hooks: sessionHooks,
});
```

### SSE Event Forwarding
All 40+ session event types are forwarded to the frontend via SSE from `/api/pipeline/stream`.

## Don'ts

- Don't hardcode model names outside of config — use `client.listModels()` for dynamic selection.
- Don't create separate server processes — everything runs in Next.js API routes.
- Don't use WebSockets — use SSE for server-to-client streaming.
- Don't store secrets in task JSON files — they persist to disk.
- Don't skip build verification in the Fixer agent — always check before committing.

## Reference

- Master spec: [Agentic-App-Dev-Master-Spec](../.spec/Agentic-App-Dev-Master-Spec.md)
- Architecture guide: [architecture.md](../docs/architecture.md)
- Project Knowledge system: [project-knowledge.md](../docs/project-knowledge.md)
- Markdown rendering: [markdown-rendering.md](../docs/markdown-rendering.md)
- Configuration reference: [configuration.md](../docs/configuration.md)
- Copilot SDK skill: [SKILL.md](./skills/copilot-sdk/SKILL.md)
- Next.js patterns: [SKILL.md](./skills/next-best-practices/SKILL.md)
- Frontend design: [SKILL.md](./skills/frontend-design/SKILL.md)
- Playwright automation: [SKILL.md](./skills/playwright-cli/SKILL.md)
- Excalidraw diagrams: [SKILL.md](./skills/excalidraw-diagram-skill/SKILL.md)