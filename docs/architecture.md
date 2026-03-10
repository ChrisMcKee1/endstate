# Architecture Guide

This document explains the architecture of Endstate — how agents are orchestrated, how data flows, and how the pieces fit together.

**Visual diagrams** — open the `.excalidraw` files for interactive views:
- [Pipeline Flow — Agent DAG](architecture/pipeline-flow.excalidraw) — Full pipeline execution graph with entry, fan-out, parallel domains, convergence gate, and cycle loop
- [Agent Responsibilities](architecture/agent-responsibilities.excalidraw) — Every agent's purpose, domain scope, MCP servers, and deliverables
- [Knowledge Flow — Data Lifecycle](architecture/knowledge-flow.excalidraw) — How research flows from the Researcher through storage into agent prompts and the Intel UI
- [Setup Wizard](architecture/setup-wizard.excalidraw) — 6-step guided configuration from project selection to pipeline launch
- [Skills Management](architecture/skills-management.excalidraw) — Discovery, configuration, and injection of skills into agent sessions
- [MCP Server Management](architecture/mcp-servers.excalidraw) — Default servers, user overrides, and per-agent resolution
- [Custom Agents](architecture/custom-agents.excalidraw) — Definition, storage, and SDK injection of custom agent personas

## System Overview

The dashboard connects to the pipeline orchestrator via SSE. The orchestrator walks the agent DAG, creating Copilot SDK sessions for each agent, and broadcasts all events back to the frontend in real time.

```
Dashboard (SSE) ← Orchestrator → Agent Sessions → MCP Servers
                        ↓
                   Task Store + Cheat Sheet Store
                        ↓
                   .projects/<slug>/ (disk)
```

## Agent Graph (DAG)

The pipeline executes agents as a directed acyclic graph (DAG). See the [pipeline-flow.excalidraw](architecture/pipeline-flow.excalidraw) diagram for the full visual.

The default graph:

```
Researcher (entry, runs once)
    │
Explorer (fan-out)
    │
    ├── Analyst-UI → Fixer-UI
    ├── Analyst-Backend → Fixer-Backend  
    ├── Analyst-Database → Fixer-Database
    └── Analyst-Docs → Fixer-Docs
         │
    Consolidator (fan-in, gate)
         │
    Code Simplifier
         │
    UX Reviewer (exit, loops back)
```

Each node has: `role`, `nodeType`, `runAfter` (dependencies), `parallel` flag, `enabled` flag.

The orchestrator walks this graph topologically:
1. Find all "ready" nodes (all `runAfter` deps completed)
2. Execute ready nodes (parallel or sequential based on flags)
3. Mark completed, repeat until all nodes done

## Data Flow

### Tasks

Tasks are the central data model. Every finding, diagnosis, fix, and verification is tracked:

```
Task
├── id: "TSK-001"
├── title: "Login form missing validation"
├── severity: CRITICAL | HIGH | MEDIUM | LOW
├── status: open | in-progress | resolved | deferred | wont-fix
├── component: "Auth"
├── files: ["src/auth/login.tsx"]
├── domains: ["ui", "backend"]
├── timeline: TaskEvent[]
│   ├── { agent: "explorer", action: "discovered", detail: "..." }
│   ├── { agent: "analyst-ui", action: "diagnosed", reasoning: "..." }
│   └── { agent: "fixer-ui", action: "fixed", diff: "...", buildResult: "pass" }
└── tags: ["security", "validation"]
```

Storage: In-memory `Map` + JSON files at `.projects/<slug>/tasks/TSK-001.json`.

### Project Knowledge (Cheat Sheet)

See [project-knowledge.md](./project-knowledge.md) for detailed documentation.

### Pipeline Configuration

Stored at `.projects/<slug>/config.json` and mirrored to `.agentic-dev.json` in the target project:

```typescript
PipelineConfig {
  projectPath: string;          // Absolute path to target project
  appUrl: string;               // URL of running dev server
  inspiration: string;          // Developer's vision statement
  model: string;                // LLM model ID
  maxCycles: number;            // Maximum pipeline cycles
  fixSeverity: string;          // Minimum severity for Fixer
  enableExplorer: boolean;      // Toggle agents on/off
  enableAnalyst: boolean;
  enableFixer: boolean;
  enableUxReviewer: boolean;
  // ... domain enablement, worktree isolation, etc.
}
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/pipeline/start` | POST | Start pipeline with config |
| `/api/pipeline/stop` | POST | Stop running pipeline |
| `/api/pipeline/steer` | POST | Inject developer steering message |
| `/api/pipeline/stream` | GET | SSE stream of all pipeline events |
| `/api/tasks` | GET/POST/DELETE | Task CRUD |
| `/api/knowledge` | GET/POST/PUT/DELETE | Cheat sheet CRUD |
| `/api/settings` | GET/POST | Pipeline config persistence |
| `/api/models` | GET | Available LLM models |
| `/api/metrics` | GET | OTel metrics snapshot |
| `/api/projects` | GET/DELETE | Project management |
| `/api/git` | GET/POST | Git operations |

## SSE Event Types

Events flow from the Copilot SDK through the orchestrator to the dashboard:

| Event | Description |
|-------|-------------|
| `pipeline.state_change` | Status, active agent, cycle number |
| `pipeline.cycle_start/end` | Cycle boundaries |
| `agent.start/end` | Agent lifecycle |
| `assistant.message_delta` | Streaming text chunks |
| `assistant.message` | Complete message |
| `assistant.reasoning_delta` | Model reasoning chunks |
| `tool.execution_start/complete` | Tool invocations |
| `session.compaction_start/complete` | Context window management |
| `session.error` | Error events |

## Dashboard Layout

```
┌─ Header (status, cycle, active agent, controls) ──────────┐
├─ Main ─────────────────────────────────┬─ Sidebar (360px) ─┤
│                                        │ [Intel│Tasks│UX│…]│
│           Workflow Graph               │                   │
│         (center stage)                 │   Tab Content     │
│                                        │   (scrollable)    │
├────────────────────────────────────────┴───────────────────┤
│  Token Usage Display                                       │
├────────────────────────────────────────────────────────────┤
│  Steering Bar (input + new vision)                         │
└────────────────────────────────────────────────────────────┘
```

Sidebar tabs: **Intel** (project knowledge), **Tasks**, **UX** (scorecard), **Metrics**, **Awards**

## Per-Project Data Structure

```
.projects/
├── active.json              # Points to current project
└── <slug>/
    ├── config.json          # PipelineConfig
    ├── cheat-sheet.md       # Researcher's project knowledge
    └── tasks/
        ├── TSK-001.json
        ├── TSK-002.json
        └── ...
```
