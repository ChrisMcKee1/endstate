# Agentic Application Development — Master Specification

**Version:** 1.0
**Author:** Chris (Principal AI Architect)
**Date:** March 5, 2026
**Status:** Ready for Build

---

## Objective

Build a general-purpose, project-agnostic developer tool called **Agentic Application Development** that uses the GitHub Copilot SDK to orchestrate specialized AI agents in a continuous feedback loop. The agents explore, analyze, fix, and evaluate any application. The tool provides a real-time visual dashboard where the developer can watch agent activity, steer the pipeline, track tasks across their full lifecycle, and see the accumulated work product of arbitrarily long runs.

This is not a testing framework. It is an autonomous development partner that uses your running application, finds what is broken or confusing, fixes it, and keeps going until the app converges on stability and usability.

---

## Core Principles

1. **Project-agnostic.** Point it at any folder. If code exists, iterate on it. If the folder is empty, build from scratch based on the inspiration provided.
2. **Steerable.** The developer can inject guidance at any time. The agents adjust.
3. **Observable.** Every action, finding, fix, and decision is tracked in structured task objects that persist across sessions and can be visualized in the UI.
4. **Self-healing.** The feedback loop runs autonomously. Agents discover issues, diagnose root causes, apply fixes, verify builds, and retest. Human intervention is optional, not required.
5. **Instrumented.** Everything is powered by OpenTelemetry. Every agent action, SDK call, tool invocation, and session event emits traces and metrics.

---

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **SDK** | GitHub Copilot SDK (TypeScript) | Same language as frontend. Full feature parity with .NET/Python/Go SDKs. |
| **Model** | Claude Opus 4.6 (default, configurable) | Available via GitHub Copilot. User has unlimited premium requests. |
| **Frontend** | Next.js + React + Tailwind | Familiar stack. SSR for initial load, client-side for real-time updates. |
| **Real-time** | Server-Sent Events (SSE) | One-way stream from server to client. Simpler than WebSockets for this use case. |
| **Backend** | Next.js API Routes | Co-located with frontend. No separate server process. |
| **Observability** | OpenTelemetry (OTel) | Traces, metrics, and logs. Export to Jaeger, Grafana, or console. |
| **State** | In-memory + JSON file persistence | Task objects persist to disk. SDK sessions persist via infinite sessions. |
| **Browser Automation** | Playwright MCP Server | Gives agents a real browser to navigate the target application. |
| **Code Access** | Filesystem MCP Server | Gives agents read/write access to the target project codebase. |
| **GitHub** | GitHub MCP Server | Gives agents access to issues, PRs, branches in the target repo. |

---

## SDK Reference: Documentation Links

These are the primary sources. Every implementation decision should be validated against these docs.

| Resource | URL |
|----------|-----|
| **SDK Repository (main)** | https://github.com/github/copilot-sdk |
| **Getting Started Tutorial** | https://github.com/github/copilot-sdk/blob/main/docs/getting-started.md |
| **TypeScript SDK (npm)** | https://www.npmjs.com/package/@github/copilot-sdk |
| **TypeScript SDK Instructions** | https://github.com/github/awesome-copilot/blob/main/instructions/copilot-sdk-nodejs.instructions.md |
| **.NET SDK README** | https://github.com/github/copilot-sdk/blob/main/dotnet/README.md |
| **.NET SDK Instructions** | https://github.com/github/awesome-copilot/blob/main/instructions/copilot-sdk-csharp.instructions.md |
| **BYOK Documentation** | https://github.com/github/copilot-sdk/blob/main/docs/auth/byok.md |
| **Error Handling Cookbook** | https://github.com/github/copilot-sdk/blob/main/cookbook/dotnet/error-handling.md |
| **Copilot CLI Command Reference** | https://docs.github.com/en/copilot/reference/cli-command-reference |
| **Copilot CLI Usage Guide** | https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli |
| **Supported AI Models** | https://docs.github.com/en/copilot/reference/ai-models/supported-models |
| **Model Comparison Guide** | https://docs.github.com/en/copilot/reference/ai-models/model-comparison |
| **Awesome Copilot (community)** | https://github.com/github/awesome-copilot |
| **Agent Framework + Copilot** | https://learn.microsoft.com/en-us/agent-framework/agents/providers/github-copilot |
| **Semantic Kernel Blog Post** | https://devblogs.microsoft.com/semantic-kernel/build-ai-agents-with-github-copilot-sdk-and-microsoft-agent-framework/ |
| **Context and Token Management** | https://deepwiki.com/github/copilot-cli/3.7-context-and-token-management |
| **Model Selection Deep Dive** | https://deepwiki.com/github/copilot-cli/3.4-model-selection-and-usage |
| **SDK Advanced Topics** | https://deepwiki.com/github/copilot-sdk/10-examples-and-cookbook |
| **LobeHub Skills Reference** | https://lobehub.com/skills/microsoft-skills-copilot-sdk |
| **GitHub Topics: copilot-sdk** | https://github.com/topics/copilot-sdk |
| **PyPI Package (Python ref)** | https://pypi.org/project/github-copilot-sdk/ |
| **Community Clojure SDK API (best metadata ref)** | https://github.com/copilot-community-sdk/copilot-sdk-clojure/blob/main/doc/reference/API.md |

---

## SDK Capabilities We Will Use

### 1. CopilotClient (Singleton)

One client per application instance. Manages the CLI server connection.

```typescript
import { CopilotClient } from "@github/copilot-sdk";
const client = new CopilotClient();
await client.start();
```

**Key methods:**
- `client.start()` / `client.stop()` / `client.forceStop()`
- `client.listSessions()` — All active sessions with metadata (sessionId, summary, startTime, modifiedTime)
- `client.getLastSessionId()` — Most recent session
- `client.resumeSession(id, config)` — Resume a persisted session
- `client.getState()` — Returns `"disconnected" | "connecting" | "connected" | "error"`
- `client.ping(msg)` — Health check with timestamp
- `client.on("session.foreground" | "session.background" | "session.created" | "session.deleted" | "session.updated", handler)`
- `client.listModels()` — **Returns all available models with full metadata** (see below)

### 2. Model Listing and Metadata

The `listModels()` method returns rich metadata per model. This powers the model selector and metadata visualizations.

**Returned fields per model (documented in community SDK API reference):**

```typescript
interface ModelInfo {
  id: string;                     // "claude-opus-4.6"
  name: string;                   // "Claude Opus 4.6"
  vendor: string;                 // "anthropic"
  family: string;                 // "claude-opus-4.6"
  version: string;
  maxInputTokens: number;         // e.g., 200000
  maxOutputTokens: number;        // e.g., 16384
  preview: boolean;
  modelCapabilities: {
    modelSupports: {
      supportsVision: boolean;
      supportsReasoningEffort: boolean;
    };
    modelLimits: {
      maxPromptTokens: number;
      maxContextWindowTokens: number;   // THE context window size
      visionCapabilities?: {
        supportedMediaTypes: string[];
        maxPromptImages: number;
        maxPromptImageSize: number;     // bytes
      };
    };
  };
  modelPolicy: {
    policyState: "enabled" | "disabled";
    terms: string;
  };
  modelBilling: {
    multiplier: number;            // Premium request multiplier (e.g., 1.0)
  };
  supportedReasoningEfforts?: string[];  // ["low", "medium", "high", "xhigh"]
  defaultReasoningEffort?: string;
}
```

**UI usage:** Populate model dropdown dynamically. Show token limits, billing multiplier, capability badges (vision, reasoning), and vendor icon.

### 3. Session Creation and Configuration

Each agent is a session with isolated conversation history.

```typescript
const session = await client.createSession({
  model: "claude-opus-4.6",
  streaming: true,
  systemMessage: { content: "You are the Explorer agent..." },
  tools: [myCustomTool],
  availableTools: ["shell", "file_read"],
  excludedTools: ["file_delete"],
  mcpServers: {
    playwright: { type: "stdio", command: "npx", args: ["-y", "@anthropic/mcp-playwright"], tools: ["*"] },
    fs: { type: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "."], tools: ["*"] },
  },
  infiniteSessions: {
    enabled: true,
    backgroundCompactionThreshold: 0.75,
    bufferExhaustionThreshold: 0.90,
  },
  customAgents: [{ name: "specialist", displayName: "...", description: "...", prompt: "..." }],
  onPermissionRequest: autoApproveHandler,
  hooks: sessionHooks,
});
```

**Full SessionConfig properties:**
- `model` — Model name string
- `sessionId` — Custom session ID for deterministic naming
- `streaming` — Enable token-by-token streaming (default: false)
- `tools` — Custom tools array (via `defineTool`)
- `systemMessage` — `{ content: string }`
- `availableTools` — String array, allowlist of built-in tool names
- `excludedTools` — String array, blocklist of built-in tool names
- `provider` — BYOK provider config (not used in our case)
- `mcpServers` — `Record<string, McpLocalServerConfig | McpRemoteServerConfig>`
- `customAgents` — Agent persona definitions array
- `infiniteSessions` — `{ enabled, backgroundCompactionThreshold, bufferExhaustionThreshold }`
- `onPermissionRequest` — `(request, invocation) => { kind: "approved" | "denied-interactively-by-user" }`
- `hooks` — SessionHooks object (see below)
- `skillDirectories` — String array of skill folder paths
- `reasoningEffort` — `"low" | "medium" | "high" | "xhigh"` (for supporting models)

### 4. Session Events (40+ types)

The event system is the primary data source for the UI. Every event captured, timestamped, and forwarded via SSE.

| Event Type | Description | UI Usage |
|-----------|-------------|----------|
| `assistant.message_delta` | Streaming token chunk | Live agent output stream |
| `assistant.message` | Complete response (always fires) | Final response capture |
| `assistant.reasoning_delta` | Extended thinking chunk | Reasoning visualization |
| `assistant.reasoning` | Complete reasoning | Reasoning capture |
| `session.idle` | Session finished processing | Turn completion signal |
| `session.error` | Error occurred | Error display |
| `session.compaction_start` | Context compaction beginning | Context meter animation |
| `session.compaction_complete` | Context compaction done | Context meter update |
| `tool.execution_start` | Agent invoked a tool | Tool activity indicator |
| `tool.execution_complete` | Tool finished | Tool result capture |
| `permission.request` | Agent asking for approval | Permission prompt |

**Subscribe pattern:**
```typescript
const unsubscribe = session.on((event) => {
  // Forward to SSE, OTel, and task store
});
// Or type-specific:
session.on("assistant.message_delta", (evt) => { ... });
```

### 5. Session Hooks

Hooks intercept events at lifecycle points. These are where OTel instrumentation and steering injection go.

```typescript
const hooks: SessionHooks = {
  onPreToolUse: async (input, ctx) => {
    tracer.startSpan(`tool.${input.toolName}`);
    return { permissionDecision: "allow" };
  },
  onPostToolUse: async (input, result, ctx) => {
    span.end();
    return result;
  },
  onUserPromptSubmitted: async (prompt, ctx) => {
    // Inject steering context from the queue
    const steering = steeringQueue.dequeue();
    if (steering) return { modifiedPrompt: prompt + `\n\n[DEVELOPER STEERING]: ${steering}` };
    return { modifiedPrompt: prompt };
  },
  onSessionStart: async (ctx) => { /* log, metrics */ },
  onSessionEnd: async (ctx) => { /* cleanup, metrics */ },
  onErrorOccurred: async (error, ctx) => { /* retry/skip/abort */ },
};
```

### 6. Custom Tool Definition

```typescript
import { defineTool } from "@github/copilot-sdk";
import { z } from "zod";

const checkHealth = defineTool("check_app_health", {
  description: "Check whether the target application is running and responsive",
  parameters: z.object({ url: z.string().describe("Base URL of the application") }),
  handler: async ({ url }) => {
    const resp = await fetch(`${url}/api/health`);
    return { healthy: resp.ok, status: resp.status };
  },
});
```

**Tool result types:** Return any JSON-serializable value (auto-wrapped), a string, or a `ToolResultObject` with `{ textResultForLlm, resultType: "success" | "failure" | "error" }`.

**Important:** If you register a tool with the same name as a built-in CLI tool (e.g. `edit_file`, `read_file`), the SDK throws unless you set `overridesBuiltInTool: true`.

### 7. Session Persistence and Resume

Sessions persist to `~/.copilot/session-state/{sessionId}/`. Resume across app restarts.

```typescript
const session = await client.resumeSession(savedSessionId, {
  model: "claude-opus-4.6",  // Can reconfigure on resume
  tools: [updatedTools],
  // API keys are never persisted — re-provide BYOK config if applicable
});
```

**Reconfigurable on resume:** model, systemMessage, availableTools, excludedTools, provider, reasoningEffort, streaming, mcpServers, customAgents, skillDirectories, infiniteSessions.

---

## Core Data Model: Task Objects

Tasks are the central data structure. Every finding, fix, and evaluation is a task. Tasks accumulate agent activity over their lifetime and persist to disk.

```typescript
interface Task {
  id: string;                      // "TSK-001"
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "open" | "in-progress" | "resolved" | "deferred" | "wont-fix";
  component: string;               // "Frontend" | "API" | "Database" | "Auth" | "UX" | etc.
  cycle: number;                   // Cycle where first discovered
  files: string[];                 // Affected file paths
  tags: string[];                  // Free-form tags

  timeline: TaskEvent[];           // Full agent activity log (append-only)

  createdAt: string;               // ISO timestamp
  updatedAt: string;
  resolvedAt?: string;
}

interface TaskEvent {
  agent: "explorer" | "analyst" | "fixer" | "ux-reviewer";
  action: "discovered" | "diagnosed" | "fixed" | "verified" | "flagged" | "deferred" | "regression";
  timestamp: string;
  cycle: number;

  detail: string;                  // What the agent did/found
  expected?: string;               // What should have happened
  actual?: string;                 // What actually happened
  reasoning?: string;              // Agent's reasoning
  diff?: string;                   // Code diff (fixer actions)
  buildResult?: "pass" | "fail";
  screenshot?: string;             // Path to artifact
  otelTraceId?: string;            // OTel trace link
}
```

**Persistence:** `data/tasks/{task-id}.json`. Load all on startup, write on each update.

**Inter-agent protocol:** Agents receive a JSON summary of the current task list. Each agent reads existing tasks, adds timeline entries, and the orchestrator persists the updated state. This is the structured alternative to passing raw strings between agents.

---

## Pipeline Configuration

```typescript
interface PipelineConfig {
  projectPath: string;             // Absolute path to target project
  appUrl: string;                  // URL of running application
  inspiration: string;             // What are we building? Who is it for?
  maxCycles: number;               // 1-50
  model: string;                   // From listModels()
  autoApprove: boolean;
  infiniteSessions: boolean;
  fixSeverity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  enableExplorer: boolean;
  enableAnalyst: boolean;
  enableFixer: boolean;
  enableUxReviewer: boolean;
}
```

Persists to `.agentic-dev.json` in the target project root.

---

## Agent Definitions

### Explorer
Navigate the running app, exercise every user flow, report findings. Uses Playwright MCP. Creates Task objects for each finding. On subsequent cycles, retests previously failed tasks (regression). Uses `inspiration` to understand what flows matter.

### Analyst
Cross-reference Explorer findings with backend logs and codebase. Uses Filesystem MCP and custom log-reading tools. Traces failures to specific files and code paths. Assigns severity. Adds "diagnosed" timeline events.

### Fixer
Apply code fixes, verify builds, commit changes. Uses Filesystem MCP, GitHub MCP, shell access. Only fixes at or above configured severity threshold. Creates git branches per cycle. Reverts on build failure. Adds "fixed" events with diffs.

### UX Reviewer
Evaluate from non-technical user perspective. Uses Playwright MCP. Scores UX categories, flags jargon, developer-facing errors, empty states, navigation dead ends. Creates UX-specific tasks. Produces overall adoption verdict.

---

## OpenTelemetry Integration

### Traces (spans)

| Span Name | Parent | Key Attributes |
|-----------|--------|----------------|
| `pipeline.cycle` | root | `cycle.number`, `cycle.taskCount` |
| `agent.{name}.turn` | cycle | `agent.name`, `model`, `prompt.length` |
| `agent.{name}.response` | turn | `response.length`, `tokens.total` |
| `tool.{toolName}` | turn | `tool.name`, `tool.args`, `tool.result` |
| `mcp.{server}.{method}` | turn | `mcp.server`, `mcp.method` |
| `task.create` | turn | `task.id`, `task.severity` |
| `task.update` | turn | `task.id`, `task.status`, `event.action` |
| `session.compaction` | turn | `session.id`, `context.before`, `context.after` |

### Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `pipeline.cycles.total` | Counter | Cycles completed |
| `pipeline.tasks.created` | Counter | Tasks created |
| `pipeline.tasks.resolved` | Counter | Tasks resolved |
| `agent.turns.total` | Counter | Agent turns (per agent label) |
| `agent.tokens.input` | Counter | Input tokens (per agent) |
| `agent.tokens.output` | Counter | Output tokens (per agent) |
| `agent.latency.seconds` | Histogram | Response time per turn |
| `tool.invocations.total` | Counter | Tool calls (per tool name) |
| `session.context.usage` | Gauge | Context utilization 0.0-1.0 |
| `session.compactions.total` | Counter | Compaction events |
| `fixer.builds.pass` | Counter | Build successes |
| `fixer.builds.fail` | Counter | Build failures |
| `ux.score.{category}` | Gauge | UX score per category |

### Setup

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";

const sdk = new NodeSDK({
  resource: new Resource({
    "service.name": "agentic-app-dev",
    "service.version": "1.0.0",
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces",
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 10000,
  }),
});
sdk.start();
```

---

## UI Specifications

### Setup Wizard
1. **Project Path** — Folder picker. Detects existing code (package.json, *.csproj, etc.) or empty.
2. **Inspiration** — Large text area. Guides all agent behavior.
3. **Model Selection** — Dropdown from `listModels()`. Shows name, vendor, tokens, billing, capabilities.
4. **Pipeline Settings** — Cycles, severity threshold, agent toggles.
5. **Start.**

### Main Dashboard Layout (fixed viewport, no page scroll)
1. **Header** (fixed) — Name, project, model, cycle, LIVE/PAUSED, settings.
2. **Workflow Graph** (fixed ~100px) — SVG: Explorer > Analyst > Fixer > UX > loop-back. Active node pulses. Animated edges.
3. **Main content** (flex):
   - **Left** (flex:1) — Agent stream. Scrolls internally. Tagged, color-coded lines.
   - **Right** (360px) — Tabs: Task Log | UX Scores | Metrics.
4. **Steering Bar** (fixed bottom) — Input + send + quick chips. NEVER moves.

### Task Detail Modal
- Task header: ID, title, severity, status, cycle, files
- Files list with language icons, clickable to open diff preview
- Agent timeline: vertical, colored nodes, detail/expected/actual/reasoning/diff per entry
- OTel trace link per entry

### File Diff Preview
- Git-style: red removed, green added, context lines
- Syntax highlighting, line numbers
- File path breadcrumb

### Context Meter
- Per-session gauge (0-100%)
- Color: green < 50%, yellow 50-75%, orange 75-90%, red > 90%
- Animated pulse during compaction
- Shows: current tokens / max tokens

### Metrics Bar
- Tokens consumed (per agent)
- Avg latency
- Tasks created/resolved/open
- Build pass/fail ratio
- Cycles completed

### Celebration Effects
| Milestone | Effect |
|-----------|--------|
| First task resolved | Small confetti |
| All CRITICAL resolved | Full-screen confetti |
| UX avg > 7/10 | Golden glow on UX panel |
| Zero open tasks | Full celebration + banner |
| Pipeline converges (STOP) | Sparkle + badge |
| Build passes | Green flash on Fixer node |
| Build fails | Red shake on Fixer node |

Use `canvas-confetti` library.

---

## Project Structure

```
agentic-app-dev/
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── .env.local
├── otel-collector-config.yaml
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Dashboard
│   │   ├── setup/page.tsx             # Setup wizard
│   │   └── api/
│   │       ├── pipeline/
│   │       │   ├── start/route.ts
│   │       │   ├── stop/route.ts
│   │       │   ├── steer/route.ts
│   │       │   └── stream/route.ts    # SSE
│   │       ├── models/route.ts
│   │       ├── tasks/route.ts
│   │       └── settings/route.ts
│   ├── lib/
│   │   ├── copilot/
│   │   │   ├── client.ts              # Singleton
│   │   │   ├── agents.ts              # Session factory
│   │   │   ├── instructions/          # .md per agent
│   │   │   └── tools.ts
│   │   ├── pipeline/
│   │   │   ├── orchestrator.ts        # Feedback loop
│   │   │   ├── task-store.ts
│   │   │   └── steering.ts
│   │   ├── otel/
│   │   │   ├── setup.ts
│   │   │   ├── spans.ts
│   │   │   └── metrics.ts
│   │   └── types.ts
│   └── components/
│       ├── Dashboard.tsx
│       ├── WorkflowGraph.tsx
│       ├── AgentStream.tsx
│       ├── SteeringBar.tsx
│       ├── TaskList.tsx
│       ├── TaskDetail.tsx
│       ├── UxScorecard.tsx
│       ├── FileDiffPreview.tsx
│       ├── ModelSelector.tsx
│       ├── ContextMeter.tsx
│       ├── SettingsPanel.tsx
│       ├── SetupWizard.tsx
│       ├── CelebrationEffects.tsx
│       └── MetricsBar.tsx
└── data/tasks/                        # Persisted JSON
```

---

## Build Phases

### Phase 1: Foundation (Week 1)
- [ ] Initialize Next.js + TypeScript + Tailwind
- [ ] Install @github/copilot-sdk
- [ ] CopilotClient singleton
- [ ] listModels() integration
- [ ] Agent system prompts in markdown
- [ ] Session factory from config
- [ ] Basic orchestrator loop (terminal output)
- [ ] Task interface + in-memory store
- [ ] Test: one full cycle against test project

### Phase 2: API Layer + SSE (Week 2)
- [ ] /api/pipeline/start, stop, steer, stream
- [ ] /api/models, tasks, settings
- [ ] Task persistence to JSON
- [ ] Steering injection via onUserPromptSubmitted hook
- [ ] SSE streaming of all agent events

### Phase 3: Dashboard UI (Week 3)
- [ ] Dashboard layout (fixed viewport)
- [ ] WorkflowGraph SVG with animations
- [ ] AgentStream with internal scroll
- [ ] SteeringBar pinned to bottom
- [ ] TaskList + TaskDetail modal
- [ ] ModelSelector from API
- [ ] SettingsPanel
- [ ] SSE client hook

### Phase 4: Setup Wizard + Project Detection (Week 4)
- [ ] SetupWizard component
- [ ] Project detection (package.json, csproj, etc.)
- [ ] Inspiration flows into agent system prompts
- [ ] Empty folder = build mode, existing code = iterate mode
- [ ] Config persistence to .agentic-dev.json

### Phase 5: Diff Preview + File Tree (Week 5)
- [ ] FileDiffPreview with syntax highlighting
- [ ] File tree panel with change counts
- [ ] Git diff integration from fixer branches
- [ ] Click-through from task timeline to diff

### Phase 6: OTel + Metrics (Week 6)
- [ ] OTel SDK setup
- [ ] Instrument agent turns, tool calls, task CRUD
- [ ] ContextMeter component
- [ ] MetricsBar component
- [ ] Optional Jaeger + Grafana config

### Phase 7: Celebrations + Polish (Week 7)
- [ ] CelebrationEffects with canvas-confetti
- [ ] Milestone detection in orchestrator
- [ ] Error boundaries
- [ ] Graceful degradation (CLI missing, app down, network fail)
- [ ] Session resume on restart
- [ ] Keyboard shortcuts
- [ ] README

---

## Steering Mechanism

1. Developer types in steering bar, hits Send.
2. POST to /api/pipeline/steer.
3. Message queued server-side.
4. `onUserPromptSubmitted` hook dequeues and appends: `[DEVELOPER STEERING]: {message}`
5. Agent reads it and adjusts behavior. Session history preserves the steering.

**Quick-action chips:** "Skip to UX review", "Focus on Plaid flows", "Test mobile only", "Run security checks", "Increase cycles by 3", "Only test the dashboard", "Focus on empty states".

---

## Convergence Logic

After each cycle, ask the Analyst:

> Based on everything across all cycles, are there unresolved CRITICAL or HIGH tasks? Significant untested areas? UX hard blockers? Respond with CONTINUE or STOP and reasoning.

STOP = end pipeline, final reports, celebrations.
CONTINUE = next cycle.
Max cycles = hard stop regardless.

---

## Inspiration System

The `inspiration` field flows into every agent system prompt:

```
PROJECT CONTEXT:
Path: /path/to/project
Inspiration: "{user's description of what they're building and who it's for}"
```

This tells every agent what to test, what "good UX" means, who the users are, and what tech stack to expect. Makes the entire pipeline project-agnostic.

---

## Open Questions for Build Time

1. **Playwright MCP compatibility.** Validate @anthropic/mcp-playwright with Copilot CLI MCP loading. Fallback: shell tool + Playwright scripts.
2. **Token usage per turn.** listModels gives max tokens. Real-time per-turn usage may only come from compaction events. Investigate if assistant.message includes token counts.
3. **Concurrent session limits.** Docs confirm multiple sessions per client. Verify no practical CLI-side limit.
4. **Session resume reliability.** Test client.resumeSession() with the task store after app restart.
5. **Electron/Tauri.** Not needed now. If desktop packaging wanted later, Tauri wraps any web app with minimal overhead.

---

## Summary

This document is the single source of truth for building Agentic Application Development. It contains every design decision, every SDK API surface, every data structure, every UI component, every OTel metric, and every documentation link. Start at Phase 1 and this spec guides every decision.
