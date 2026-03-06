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
| State | In-memory + JSON file persistence (`data/tasks/`) |
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

## Project Structure

```
src/
├── app/
│   ├── layout.tsx / page.tsx          # Dashboard
│   ├── setup/page.tsx                 # Setup wizard
│   └── api/
│       ├── pipeline/{start,stop,steer,stream}/route.ts
│       ├── models/route.ts
│       ├── tasks/route.ts
│       └── settings/route.ts
├── lib/
│   ├── copilot/                       # SDK singleton, session factory, tools
│   │   └── instructions/             # Markdown system prompts per agent
│   ├── pipeline/                      # Orchestrator, task store, steering queue
│   ├── otel/                          # OTel setup, spans, metrics
│   └── types.ts                       # Task, TaskEvent, PipelineConfig interfaces
├── components/                        # Dashboard, WorkflowGraph, AgentStream, etc.
data/tasks/                            # Persisted task JSON files
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

### Frontend
- Tailwind utility classes — no CSS modules, no styled-components.
- Dashboard layout is **fixed viewport, no page scroll**. Individual panels scroll internally.
- Use `canvas-confetti` for celebration effects (milestones, convergence).
- Prefer bold, intentional design over generic AI aesthetics (see `frontend-design` skill).

### State & Persistence
- Task store is in-memory with JSON file persistence to `data/tasks/{task-id}.json`.
- Pipeline config persists to `.agentic-dev.json` in the target project root.
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

- Master spec: [.spec/Agentic-App-Dev-Master-Spec.md](../.spec/Agentic-App-Dev-Master-Spec.md)
- Copilot SDK skill: [.github/skills/copilot-sdk/](skills/copilot-sdk/)
- Next.js patterns: [.github/skills/next-best-practices/](skills/next-best-practices/)
- Frontend design: [.github/skills/frontend-design/](skills/frontend-design/)
- Playwright automation: [.github/skills/playwright-cli/](skills/playwright-cli/)
