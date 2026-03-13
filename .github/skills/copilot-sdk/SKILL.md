---
name: copilot-sdk
description: Build agentic applications with GitHub Copilot SDK. Use when embedding AI agents in apps, creating custom tools, implementing streaming responses, managing sessions, connecting to MCP servers, or creating custom agents. Triggers on Copilot SDK, GitHub SDK, agentic app, embed Copilot, programmable agent, MCP server, custom agent.
---

# GitHub Copilot SDK — Endstate Reference

> `@github/copilot-sdk` v0.1.30 · TypeScript · Reverse-engineered from installed module declarations.
>
> This skill is Endstate-specific. It covers what the SDK provides, what Endstate uses, what it doesn't use yet, and where to get the most value from deeper integration.

## Exports

```ts
import { CopilotClient } from "@github/copilot-sdk";     // Client singleton
import { CopilotSession } from "@github/copilot-sdk";     // Session handle
import { defineTool, approveAll } from "@github/copilot-sdk"; // Tool definition + permission helper
```

---

## Quick Start

```ts
// 1. Create client singleton
const client = new CopilotClient();
await client.start();

// 2. Create a session
const session = await client.createSession({
  model: "claude-opus-4.6",
  streaming: true,
  systemMessage: { mode: "replace", content: "You are an expert agent..." },
  tools: [myTool],
  mcpServers: { fs: { type: "local", command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "."], tools: ["*"] } },
  infiniteSessions: { enabled: true },
  onPermissionRequest: approveAll,
  hooks: myHooks,
});

// 3. Send a message and wait for response
const response = await session.sendAndWait({ prompt: "Analyze this codebase" });
console.log(response?.content);

// 4. Subscribe to events (for streaming)
session.on("assistant.message_delta", (e) => process.stdout.write(e.content));
session.on("session.idle", () => console.log("Turn complete"));
```

---

## Core Patterns (What Endstate Uses)

### Session Factory
Each agent (Explorer, Analyst, Fixer, UX Reviewer, etc.) gets an isolated session with its own system prompt, tools, and MCP servers. See [assets/session-factory-pattern.ts](assets/session-factory-pattern.ts).

Key decisions:
- `systemMessage.mode: "replace"` — full control over system prompt (no built-in preamble)
- `approveAll` permission handler — agents run autonomously
- `infiniteSessions.enabled: true` — SDK handles context compaction transparently
- `workingDirectory` scoped to target project

### Session Hooks
Hooks intercept lifecycle events for OTel instrumentation and developer steering injection:
- `onPreToolUse` → Start OTel span, record tool invocation metric
- `onPostToolUse` → End OTel span
- `onUserPromptSubmitted` → Dequeue steering message, append `[DEVELOPER STEERING]: ...`

See [assets/hook-patterns.ts](assets/hook-patterns.ts) and [references/session-config.md](references/session-config.md).

### Custom Tools
```ts
const tool = defineTool("create_task", {
  description: "Create a task object for a discovered issue",
  parameters: z.object({ title: z.string(), severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]) }),
  handler: async ({ title, severity }) => {
    const task = taskStore.create({ title, severity });
    return { taskId: task.id, status: "created" };
  },
});
```

### MCP Servers
Per-role assignment:
| Role | Servers |
|------|---------|
| Explorer, UX Reviewer | filesystem |
| Fixer, Consolidator, Code Simplifier | filesystem + github |
| Analyst, Researcher | filesystem |

All agents also receive the `playwright-cli` skill directory for browser automation.

### SSE Event Forwarding
All 40+ session events are forwarded via SSE to the dashboard. See [assets/event-forwarding-pattern.ts](assets/event-forwarding-pattern.ts).

---

## Event System

The SDK emits 40+ event types across these categories:

| Category | Key Events | UI Impact |
|----------|-----------|-----------|
| **Session lifecycle** | `session.start`, `session.idle`, `session.error`, `session.shutdown` | Status indicators, error display |
| **Assistant** | `message_delta`, `message`, `reasoning_delta`, `turn_start/end`, `usage` | Agent stream, token tracking |
| **Tools** | `execution_start`, `execution_complete`, `execution_progress` | Tool activity indicators |
| **Context** | `usage_info`, `compaction_start/complete`, `truncation` | ContextMeter, compaction animation |
| **Subagents** | `subagent.started/completed/failed` | Custom agent lifecycle |

**Full reference:** [references/session-events.md](references/session-events.md)

---

## Unused SDK Capabilities

These features exist in the SDK but Endstate doesn't use them yet. Ordered by implementation value:

### HIGH VALUE

1. **`assistant.usage` event** — Per-call token counts: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `cost`, `duration`. Replaces manual token estimation. Feed directly to MetricsBar + OTel counters. See [assets/token-tracking.ts](assets/token-tracking.ts).

2. **`session.usage_info` event** — Live context window: `tokenLimit`, `currentTokens`, `messagesLength`. Native data source for ContextMeter component — no estimation needed. See [assets/token-tracking.ts](assets/token-tracking.ts).

### MEDIUM VALUE

3. **`session.shutdown` event** — End-of-session summary with `totalPremiumRequests`, `totalApiDurationMs`, `codeChanges` (linesAdded/Removed, filesModified), and per-model `modelMetrics`. Free reporting data.

4. **`session.rpc.compaction.compact()`** — Manual compaction trigger. Useful before sending large prompts (task summaries, full codebase analysis). See [assets/manual-compaction.ts](assets/manual-compaction.ts).

5. **`client.rpc.account.getQuota()`** — Account-level quota info (entitlement, used, remaining%, resetDate). Display in header/metrics. See [assets/quota-check.ts](assets/quota-check.ts).

6. **`client.rpc.tools.list()`** — List all built-in tools with JSON schemas and instructions. Could power the ToolManager panel with real data instead of hardcoded lists.

### LOWER VALUE

7. **`session.setModel(model)`** — Hot-swap model mid-session without destroying/recreating the session.

8. **`session.rpc.mode.set("autopilot")`** — Switch agents between `"interactive"`, `"plan"`, and `"autopilot"` modes.

9. **`session.rpc.plan.*`** — Read/write/delete plans in session workspace. Could expose agent plans in the dashboard.

10. **`onUserInputRequest` handler** — Enables the built-in `ask_user` tool for interactive agent-developer Q&A.

11. **`tool.execution_progress`** — Streaming progress from long-running tools.

12. **`assistant.intent`** — Model's classified intent before responding.

13. **`subagent.*` events** — Custom agent lifecycle tracking (started/completed/failed).

14. **`session.truncation`** — Non-compaction overflow handling metrics.

15. **`clientName` option** — Identifies the SDK consumer in User-Agent headers.

---

## Reference Documentation

| Document | Contents |
|----------|----------|
| [references/api-surface.md](references/api-surface.md) | Full `CopilotClient` + `CopilotSession` API reference |
| [references/session-events.md](references/session-events.md) | All 40+ event types with TypeScript payloads |
| [references/session-config.md](references/session-config.md) | `SessionConfig`, hooks, permissions, MCP server config |
| [references/types-reference.md](references/types-reference.md) | All exported types (`ModelInfo`, `ToolDefinition`, `SessionEvent`, etc.) |

## Code Examples

| Asset | Pattern |
|-------|---------|
| [assets/session-factory-pattern.ts](assets/session-factory-pattern.ts) | How Endstate creates isolated agent sessions |
| [assets/hook-patterns.ts](assets/hook-patterns.ts) | OTel instrumentation, steering injection, error handling |
| [assets/event-forwarding-pattern.ts](assets/event-forwarding-pattern.ts) | SSE event forwarding from SDK to dashboard |
| [assets/token-tracking.ts](assets/token-tracking.ts) | Native token tracking via `assistant.usage` event |
| [assets/manual-compaction.ts](assets/manual-compaction.ts) | Proactive compaction via `session.rpc.compaction` |
| [assets/quota-check.ts](assets/quota-check.ts) | Account quota checking via `client.rpc.account` |

---

## Audit: Implementation Priorities

Based on reverse-engineering the SDK and auditing the Endstate codebase, these are the specific integration gaps and highest-value fixes:

### Current State — What Works

| Feature | Status |
|---------|--------|
| `assistant.message_delta` subscription | Working — streams to AgentStream + extracts cheat sheet |
| `assistant.usage` event tracking | Working — feeds `recordAgentTokens()` in MetricsBar |
| `session.idle` handling | Working — triggers cleanup after each turn |
| `approveAll` permission handler | Working — agents run autonomously |
| `infiniteSessions.enabled` | Working — SDK handles compaction |
| `listModels()` for model metadata | Working — ContextMeter uses `max_context_window_tokens` |
| OTel token counters defined | Working — `agentTokensInput/Output` counters exist and fire |

### Current State — Previously Dead Code (now connected)

| Function | File | Status |
|----------|------|--------|
| `recordCompaction()` | `otel/metrics.ts` | **CONNECTED** — wired to `session.compaction_start` in orchestrator |
| `recordContextUsage()` | `otel/metrics.ts` | **CONNECTED** — fed by `recordContextWindow()` from `session.usage_info` events |
| `recordToolInvocation()` | `otel/metrics.ts` | **CONNECTED** — wired to `tool.execution_start` in orchestrator |
| `CompactionIndicator` | `TokenUsageDisplay.tsx` | **CONNECTED** — metrics now flow through `recordCompaction()` |

### Current State — Missing Event Subscriptions

| Event | Impact |
|-------|--------|
| `session.compaction_start/complete` | Compaction invisible to UI and OTel |
| `assistant.reasoning_delta/reasoning` | Extended thinking tokens not tracked or displayed |
| `session.shutdown` | No end-of-session summary (premiumRequests, codeChanges) |
| `session.usage_info` | No native context window tracking |
| `tool.execution_progress` | No streaming tool output |

### Tier 1 — COMPLETED

- [x] **Subscribe to `session.compaction_start`** in orchestrator event handler → calls `recordCompaction()`
- [x] **Subscribe to `session.usage_info`** → calls `recordContextWindow()` for native context tracking
- [x] **Subscribe to `tool.execution_start`** → calls `recordToolInvocation()` for OTel
- [x] **Subscribe to `session.shutdown`** → calls `recordSessionShutdown()` for end-of-session metrics
- [x] **Set `clientName: "endstate"`** in SessionConfig (session-level, not client-level)
- [x] **Cache read/write token tracking** — `recordAgentTokens()` now accepts cacheRead/cacheWrite from `assistant.usage`
- [x] **TokenUsageDisplay** — `ContextGauge` now prefers SDK-native `contextTokenLimit` over hardcoded 200K
- [x] **Dashboard** — Handles `session.usage_info` and `session.shutdown` SSE events
- [x] **New `/api/quota` route** — exposes `client.rpc.account.getQuota()` + `getAuthStatus()`
- [x] **New `/api/tools` route** — exposes `client.rpc.tools.list()` for built-in tool enumeration
- [x] **New client utilities** — `getAuthStatus()`, `listBuiltInTools()`, `getAccountQuota()`, `listSessions()`, `resumeSession()`
- [x] **Extended MetricsSnapshot** — added `contextTokenLimit`, `contextCurrentTokens`, `agentCacheReadTokens`, `agentCacheWriteTokens`, `totalPremiumRequests`, `totalCodeChanges`
- [x] **Extended SESSION_EVENT_TYPES** — added `assistant.usage`, `assistant.turn_start/end`, `assistant.intent`, `session.start`, `session.shutdown`, `session.usage_info`, `session.model_change`, `session.truncation`, `tool.execution_progress`, `subagent.*`

### Tier 2 — Remaining (for future implementation)

- [ ] **Session persistence / resume** via `client.listSessions()` + `client.resumeSession()`
  - Save session IDs to `.projects/<slug>/sessions.json`
  - On pipeline resume, attempt `resumeSession()` instead of `createSession()`
  - Reduces token waste, preserves conversation context across restarts

- [ ] **Manual compaction** via `session.rpc.compaction.compact()`
  - Call before large task summary prompts in orchestrator
  - Trigger when `usage_info.currentTokens / tokenLimit > 0.80`

- [ ] **ToolManager integration** — Use `/api/tools` route data in ToolManager component

- [ ] **Quota display** — Use `/api/quota` route data in dashboard header

### Tier 3 — Consider Later (experimental/future)
- [ ] Permission audit trail (replace `approveAll` with logging wrapper)
- [ ] `session.rpc.plan.read()` → expose agent plans in dashboard
- [ ] `onUserInputRequest` → interactive agent-developer Q&A
- [ ] `tool.execution_progress` → streaming tool output in AgentStream
- [ ] `assistant.intent` → intent classification display
- [ ] `subagent.*` events → custom agent lifecycle in WorkflowGraph
- [ ] `session.setModel()` → mid-session model hot-swap

---

## Reference Documentation

| Document | Contents |
|----------|----------|
| [references/api-surface.md](references/api-surface.md) | Full `CopilotClient` + `CopilotSession` API reference |
| [references/session-events.md](references/session-events.md) | All 40+ event types with TypeScript payloads |
| [references/session-config.md](references/session-config.md) | `SessionConfig`, hooks, permissions, MCP server config |
| [references/types-reference.md](references/types-reference.md) | All exported types (`ModelInfo`, `ToolDefinition`, `SessionEvent`, etc.) |

## Code Examples

| Asset | Pattern |
|-------|---------|
| [assets/session-factory-pattern.ts](assets/session-factory-pattern.ts) | How Endstate creates isolated agent sessions |
| [assets/hook-patterns.ts](assets/hook-patterns.ts) | OTel instrumentation, steering injection, error handling |
| [assets/event-forwarding-pattern.ts](assets/event-forwarding-pattern.ts) | SSE event forwarding from SDK to dashboard |
| [assets/token-tracking.ts](assets/token-tracking.ts) | Native token tracking via `assistant.usage` event |
| [assets/manual-compaction.ts](assets/manual-compaction.ts) | Proactive compaction via `session.rpc.compaction` |
| [assets/quota-check.ts](assets/quota-check.ts) | Account quota checking via `client.rpc.account` |

---

## Audit: Implementation Priorities

Based on reverse-engineering the SDK and comparing against Endstate's current usage, these are the highest-value integrations:

### Tier 1 — Implement First (direct value, straightforward)
- [ ] Subscribe to `assistant.usage` event in agent sessions → feed real token counts to MetricsBar + OTel (`agent.tokens.input/output` counters)
- [ ] Subscribe to `session.usage_info` event → feed `tokenLimit`/`currentTokens` to ContextMeter (replace estimation logic)
- [ ] Set `clientName: "endstate"` in CopilotClient options (trivial, better telemetry)

### Tier 2 — Implement Next (meaningful improvements)
- [ ] Subscribe to `session.shutdown` event → capture `codeChanges` and `modelMetrics` for end-of-cycle reporting
- [ ] Add `session.rpc.compaction.compact()` call before large task summary prompts in orchestrator
- [ ] Add `/api/quota` route that calls `client.rpc.account.getQuota()` → display in header
- [ ] Use `client.rpc.tools.list()` to populate ToolManager with real built-in tool data

### Tier 3 — Consider Later (experimental/future)
- [ ] Expose `session.rpc.plan.read()` in dashboard for agent plan visibility
- [ ] Implement `onUserInputRequest` for interactive steering (agent asks developer questions)
- [ ] Forward `tool.execution_progress` events for streaming tool output in AgentStream
- [ ] Forward `assistant.intent` for intent classification display
- [ ] Track `subagent.*` events for custom agent lifecycle in WorkflowGraph

