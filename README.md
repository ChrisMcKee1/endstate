<p align="center">
  <img src="docs/endstate-logo.svg" alt="Endstate" width="480" />
</p>

<p align="center">
  <strong>Define the outcome. Endstate handles the rest.</strong><br/>
  <em>Autonomous, multi-agent software delivery. From vision to outcome.</em>
</p>

---

Endstate is an autonomous, multi-agent software delivery system. You describe the vision. Endstate analyzes the current state of your application, orchestrates specialized agents, and iterates until the result matches the target.

You paint the vision. Endstate closes the gap.

---

## What It Does

Endstate points at a target codebase and runs a continuous pipeline of AI agents that research, explore, analyze, fix, review, and simplify — looping until the outcome reaches the desired level of quality.

**The flow:**

1. **You define the target.** A project path, an app URL, and a description of what "done" looks like.
2. **Endstate studies the current state.** The Researcher agent deeply explores the codebase and produces a cheat sheet. The Explorer agent navigates the running app in a real browser to find issues.
3. **Domain-scoped agents close the gap.** Analyst and Fixer agents are paired per domain (UI, Backend, Database, Docs) and run in parallel. Each Analyst diagnoses root causes, then the paired Fixer writes code, verifies builds, and commits.
4. **The Consolidator merges and verifies.** After all domain fixers complete, the Consolidator merges their worktree changes and runs the combined build.
5. **Quality gates refine the result.** The Code Simplifier reviews the diff for unnecessary complexity. The UX Reviewer tests the app in a real browser from a non-technical user perspective.
6. **The pipeline loops.** Each cycle discovers, fixes, and refines. Tasks are tracked, metrics are recorded, and progress is visible in real time. The Analyst decides when to stop.

## The Agents

Endstate uses 15 specialized agent roles organized in a configurable DAG:

### Core Agents

| Agent | Purpose |
|-------|---------|
| **Researcher** | Runs once at pipeline start to learn the project — discovers tech stack, architecture, build commands, and creates a cheat sheet for all other agents |
| **Explorer** | Navigates the running app in a browser, exercises user flows, and creates tasks for every bug, broken element, or unexpected behavior found |
| **Consolidator** | Merges worktree changes from all domain fixers, verifies the combined build passes, resolves conflicts, and decides continue or stop |
| **Code Simplifier** | Reviews code changes from the current cycle and simplifies for clarity — removes unnecessary wrappers, dead code, and over-abstraction without changing behavior |
| **UX Reviewer** | Evaluates the app from a non-technical user perspective — scores navigation, error handling, empty states, accessibility, and visual design |

### Domain-Scoped Agent Pairs

Each enabled domain gets a paired Analyst + Fixer. Analysts from different domains run in parallel for speed.

| Domain | Analyst | Fixer |
|--------|---------|-------|
| **UI** | Analyses components, layouts, styling, accessibility, client-side rendering | Fixes UI code — components, styles, layouts, accessibility markup |
| **Backend** | Analyses API routes, middleware, auth, integrations, business logic | Fixes server-side code — routes, validation, integrations, error handling |
| **Database** | Analyses schemas, migrations, ORM queries, data integrity, caching | Fixes data layer — schemas, migrations, queries, seed data |
| **Docs** | Analyses README accuracy, API docs, code comments, setup guides | Updates documentation to match the current codebase |

Agents are orchestrated in a configurable DAG. You control the order, toggle domains on or off, and set how many cycles to run.

## The Dashboard

A real-time orchestration interface built with Next.js:

- **Workflow graph** — visual DAG of the agent pipeline with active-node highlighting, completion checkmarks, and hover tooltips explaining each agent's purpose
- **Live agent stream** — click any node to watch the agent think, use tools, and produce output in real time via SSE
- **Task tracking** — every issue discovered is logged with severity, status, timeline, and affected files
- **Vision queue** — when the pipeline finishes, type your next vision directly in the steering bar to start a new run without returning to setup
- **Steering** — send mid-run instructions to redirect the pipeline while agents are working
- **Metrics** — per-agent token usage, tool invocations, build pass/fail counts, context utilization
- **Project management** — list, inspect, and delete old project data from the `.projects/` directory
- **Git panel** — view status, diffs, and commit history for the target project
- **Awards** — achievement badges for milestones (first fix, clean sweep, convergence)
- **Themes** — Holographic (default), Pip-Boy, CRT, and Mainframe visual modes

## Prerequisites

- **Node.js 18+**
- **GitHub Copilot CLI** installed and authenticated — `copilot --version`

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The setup wizard walks through:

1. **Project** — select the target codebase path
2. **Vision** — describe what you want Endstate to accomplish
3. **Model** — choose the AI model (queried from Copilot CLI)
4. **Pipeline** — configure cycles, severity threshold, and agent/domain toggles
5. **Customize** — manage skills, MCP servers, custom agents, and tool overrides
6. **Launch** — review and start

## Architecture

```
src/
  app/                Next.js App Router: pages, API routes, server actions
  components/         React UI: Dashboard, SetupWizard, WorkflowGraph, etc.
  hooks/              Client hooks (SSE connection)
  lib/
    agent-visuals.ts  Centralized per-agent colors, labels, icons, descriptions
    copilot/          Agent session creation, system prompts, tools
      agents/         Markdown system prompts per agent role (15 files)
    pipeline/         Orchestrator, task store, project resolver, MCP manager
    otel/             OpenTelemetry instrumentation (traces, metrics)
    schemas.ts        Zod validation for pipeline config
    types.ts          Shared TypeScript types
.projects/            Per-project data (tasks, config) — gitignored
```

Built on the [GitHub Copilot SDK](https://github.com/github/copilot-sdk) for agent sessions, with MCP server integration for filesystem access ([`@modelcontextprotocol/server-filesystem`](https://github.com/modelcontextprotocol/servers)), browser automation ([`@playwright/mcp`](https://github.com/microsoft/playwright-mcp)), and GitHub operations ([`@modelcontextprotocol/server-github`](https://github.com/modelcontextprotocol/servers)).

## State & Persistence

- **Task store** — in-memory with JSON file persistence to `.projects/<slug>/tasks/{task-id}.json`
- **Pipeline config** — saved to `.projects/<slug>/config.json` (and mirrored to `.agentic-dev.json` in the target project root)
- **Active project** — tracked via `.projects/active.json` for automatic resolution
- **No database** — all state is flat JSON files

## Why It Exists

Because builders should spend more time defining the vision and less time manually driving every step required to achieve it. Endstate closes the gap between intent and execution by handling the research, orchestration, iteration, and refinement required to turn a desired state into a delivered outcome.

*The system between idea and done.*
