# Copilot SDK — Session Events Reference

> All 40+ event types emitted by `CopilotSession`. Subscribe with `session.on(handler)` or `session.on("event.type", handler)`.

## Event Categories

### Session Lifecycle

#### `session.start`
Fired when session begins.
```ts
{
  type: "session.start";
  sessionId: string;
  version: string;
  producer: string;
  copilotVersion: string;
  selectedModel: string;
  context?: { cwd: string; gitRoot?: string; repository?: string; branch?: string };
}
```

#### `session.resume`
Fired when a persisted session is resumed.
```ts
{
  type: "session.resume";
  resumeTime: string;
  eventCount: number;
  context?: { cwd: string; gitRoot?: string; repository?: string; branch?: string };
}
```

#### `session.idle`
Fired when the session has finished processing the current turn. **This is the signal to send the next message.**
```ts
{ type: "session.idle" }
```

#### `session.error`
```ts
{
  type: "session.error";
  errorType: string;
  message: string;
  stack?: string;
  statusCode?: number;
  providerCallId?: string;
}
```

#### `session.shutdown`
Fired when session ends. Contains rich summary metrics.
```ts
{
  type: "session.shutdown";
  totalPremiumRequests: number;
  totalApiDurationMs: number;
  codeChanges?: {
    linesAdded: number;
    linesRemoved: number;
    filesModified: number;
  };
  modelMetrics?: Array<{
    model: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
  }>;
}
```
**Endstate opportunity:** Use this for end-of-agent-session reporting in MetricsBar.

#### `session.title_changed`
```ts
{ type: "session.title_changed"; title: string }
```

#### `session.info` / `session.warning`
```ts
{ type: "session.info"; infoType: string; message: string }
{ type: "session.warning"; warningType: string; message: string }
```

#### `session.model_change`
```ts
{ type: "session.model_change"; previousModel: string; newModel: string }
```

#### `session.mode_changed`
```ts
{ type: "session.mode_changed"; previousMode: string; newMode: string }
```

#### `session.plan_changed`
```ts
{ type: "session.plan_changed"; operation: "create" | "update" | "delete" }
```

#### `session.workspace_file_changed`
```ts
{ type: "session.workspace_file_changed"; path: string; operation: string }
```

#### `session.handoff`
Remote/local session handoff.
```ts
{
  type: "session.handoff";
  direction: "remote-to-local" | "local-to-remote";
  repository?: string;
}
```

---

### Context Management

#### `session.usage_info`
Live context window state. **Perfect for ContextMeter component.**
```ts
{
  type: "session.usage_info";
  tokenLimit: number;
  currentTokens: number;
  messagesLength: number;
}
```

#### `session.compaction_start`
```ts
{
  type: "session.compaction_start";
  tokensBeforeCompaction?: number;
}
```

#### `session.compaction_complete`
```ts
{
  type: "session.compaction_complete";
  tokensFreed?: number;
  tokensAfterCompaction?: number;
  checkpointId?: string;
}
```

#### `session.truncation`
Non-compaction context overflow handling.
```ts
{
  type: "session.truncation";
  preTokenCount: number;
  postTokenCount: number;
  preMessageCount: number;
  postMessageCount: number;
}
```

#### `session.snapshot_rewind`
Session history rollback.
```ts
{
  type: "session.snapshot_rewind";
  upToEventId: string;
  eventsRemoved: number;
}
```

#### `session.context_changed`
```ts
{
  type: "session.context_changed";
  cwd: string;
  gitRoot?: string;
  repository?: string;
  branch?: string;
}
```

#### `session.task_complete`
```ts
{ type: "session.task_complete"; summary: string }
```

---

### User Events

#### `user.message`
```ts
{
  type: "user.message";
  content: string;
  transformedContent?: string;
  attachments?: Attachment[];
  source?: string;
  agentMode?: string;
  interactionId?: string;
}
```

#### `pending_messages.modified`
```ts
{ type: "pending_messages.modified" }
```

---

### Assistant Events

#### `assistant.turn_start`
```ts
{ type: "assistant.turn_start"; turnId: string; interactionId?: string }
```

#### `assistant.intent`
Model's classified intent before responding.
```ts
{ type: "assistant.intent"; intent: string }
```

#### `assistant.reasoning` / `assistant.reasoning_delta`
Extended thinking (chain-of-thought).
```ts
{ type: "assistant.reasoning"; content: string }
{ type: "assistant.reasoning_delta"; content: string }
```

#### `assistant.message` / `assistant.message_delta`
```ts
{ type: "assistant.message"; content: string }
{ type: "assistant.message_delta"; content: string }
```

#### `assistant.streaming_delta`
```ts
{ type: "assistant.streaming_delta"; totalResponseSizeBytes: number }
```

#### `assistant.turn_end`
```ts
{ type: "assistant.turn_end"; turnId: string }
```

#### `assistant.usage`
**Per-call token usage — the most valuable event for metrics.**
```ts
{
  type: "assistant.usage";
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  cost?: number;
  duration?: number;
  quotaSnapshots?: Array<{
    quotaType: string;
    entitlement: number;
    used: number;
    percentageUsed: number;
    resetDate?: string;
  }>;
  copilotUsage?: {
    tokenDetails?: Record<string, unknown>;
    totalNanoAiu?: number;
  };
}
```

---

### Tool Events

#### `tool.user_requested`
User explicitly requested a tool.
```ts
{ type: "tool.user_requested"; toolName: string }
```

#### `tool.execution_start`
```ts
{
  type: "tool.execution_start";
  toolCallId: string;
  toolName: string;
  arguments?: Record<string, unknown>;
  mcpServerName?: string;
}
```

#### `tool.execution_partial_result`
Streaming output from a long-running tool.
```ts
{
  type: "tool.execution_partial_result";
  toolCallId: string;
  partialResult: string;
}
```

#### `tool.execution_progress`
Progress updates for long operations.
```ts
{
  type: "tool.execution_progress";
  toolCallId: string;
  progress: string | Record<string, unknown>;
}
```

#### `tool.execution_complete`
```ts
{
  type: "tool.execution_complete";
  toolCallId: string;
  toolName: string;
  success: boolean;
  result?: {
    type: "text" | "terminal" | "image" | "audio" | "resource_link" | "resource";
    content: string;
  };
  error?: string;
  toolTelemetry?: Record<string, unknown>;
}
```

---

### Skill Events

#### `skill.invoked`
```ts
{
  type: "skill.invoked";
  name: string;
  path: string;
  content: string;
  allowedTools?: string[];
  pluginName?: string;
  pluginVersion?: string;
}
```

---

### Subagent Events

#### `subagent.started` / `subagent.completed` / `subagent.failed`
Custom agent lifecycle.
```ts
{ type: "subagent.started"; name: string; displayName?: string }
{ type: "subagent.completed"; name: string; result?: string }
{ type: "subagent.failed"; name: string; error: string }
```

#### `subagent.selected` / `subagent.deselected`
```ts
{ type: "subagent.selected"; name: string }
{ type: "subagent.deselected"; name: string }
```

---

### Hook Events

#### `hook.start` / `hook.end`
```ts
{
  type: "hook.start";
  hookInvocationId: string;
  hookType: string;
  input?: Record<string, unknown>;
}
{
  type: "hook.end";
  hookInvocationId: string;
  hookType: string;
  output?: Record<string, unknown>;
  success: boolean;
}
```

---

### System Events

#### `system.message`
```ts
{
  type: "system.message";
  content: string;
  role?: "system" | "developer";
  metadata?: Record<string, unknown>;
}
```
