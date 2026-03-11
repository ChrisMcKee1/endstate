# Copilot SDK — Types Reference

> All exported types from `@github/copilot-sdk` v0.1.30.

## ModelInfo

```ts
interface ModelInfo {
  id: string;                       // "claude-opus-4.6"
  name: string;                     // "Claude Opus 4.6"
  capabilities: {
    supports: {
      vision: boolean;
      reasoningEffort: boolean;
    };
    limits: {
      max_prompt_tokens?: number;
      max_context_window_tokens: number;
      vision?: {
        supportedMediaTypes: string[];
        maxPromptImages: number;
        maxPromptImageSize: number;   // bytes
      };
    };
  };
  policy?: {
    state: "enabled" | "disabled";
    terms?: string;
  };
  billing?: {
    multiplier: number;             // Premium request multiplier (1.0 = standard)
  };
  supportedReasoningEfforts?: string[];  // ["low", "medium", "high", "xhigh"]
  defaultReasoningEffort?: string;
}
```

---

## ToolDefinition

Created via `defineTool()`:

```ts
interface ToolDefinition {
  name: string;
  description?: string;
  parameters?: z.ZodSchema | Record<string, unknown>;  // Zod or JSON Schema
  handler: (args: unknown, invocation: ToolInvocation) => Promise<unknown> | unknown;
  overridesBuiltInTool?: boolean;
}
```

---

## ToolInvocation

Passed as second argument to tool handlers:

```ts
interface ToolInvocation {
  sessionId: string;
  toolCallId: string;
  toolName: string;
  arguments: unknown;
}
```

---

## ToolResultObject

Return from handler for fine-grained control:

```ts
interface ToolResultObject {
  textResultForLlm: string;
  binaryResultsForLlm?: Array<{
    data: string;         // base64
    mimeType: string;
    type: string;
    description?: string;
  }>;
  resultType: "success" | "failure" | "rejected" | "denied";
  error?: string;
  sessionLog?: string;           // Displayed in CLI session log
  toolTelemetry?: Record<string, unknown>;  // Emitted in tool.execution_complete
}
```

---

## SessionEvent

Union of all event types. See [session-events.md](./session-events.md) for details.

```ts
type SessionEvent =
  | SessionStartEvent
  | SessionResumeEvent
  | SessionIdleEvent
  | SessionErrorEvent
  | SessionShutdownEvent
  | SessionTitleChangedEvent
  | SessionInfoEvent
  | SessionWarningEvent
  | SessionModelChangeEvent
  | SessionModeChangedEvent
  | SessionPlanChangedEvent
  | SessionWorkspaceFileChangedEvent
  | SessionHandoffEvent
  | SessionUsageInfoEvent
  | SessionCompactionStartEvent
  | SessionCompactionCompleteEvent
  | SessionTruncationEvent
  | SessionSnapshotRewindEvent
  | SessionContextChangedEvent
  | SessionTaskCompleteEvent
  | UserMessageEvent
  | PendingMessagesModifiedEvent
  | AssistantTurnStartEvent
  | AssistantIntentEvent
  | AssistantReasoningEvent
  | AssistantReasoningDeltaEvent
  | AssistantMessageEvent
  | AssistantMessageDeltaEvent
  | AssistantStreamingDeltaEvent
  | AssistantTurnEndEvent
  | AssistantUsageEvent
  | ToolUserRequestedEvent
  | ToolExecutionStartEvent
  | ToolExecutionPartialResultEvent
  | ToolExecutionProgressEvent
  | ToolExecutionCompleteEvent
  | SkillInvokedEvent
  | SubagentStartedEvent
  | SubagentCompletedEvent
  | SubagentFailedEvent
  | SubagentSelectedEvent
  | SubagentDeselectedEvent
  | HookStartEvent
  | HookEndEvent
  | SystemMessageEvent;
```

---

## AssistantMessageEvent

Returned by `sendAndWait()`:

```ts
interface AssistantMessageEvent {
  type: "assistant.message";
  content: string;
}
```

---

## SessionMetadata

Returned by `client.listSessions()`:

```ts
interface SessionMetadata {
  sessionId: string;
  startTime: Date;
  modifiedTime: Date;
  summary?: string;
  isRemote: boolean;
  context?: {
    cwd: string;
    gitRoot?: string;
    repository?: string;
    branch?: string;
  };
}
```

---

## Attachment Types

```ts
type Attachment =
  | { type: "file"; path: string; displayName?: string }
  | { type: "directory"; path: string; displayName?: string }
  | {
      type: "selection";
      filePath: string;
      displayName: string;
      selection?: { start: Position; end: Position };
      text?: string;
    };

interface Position {
  line: number;
  character: number;
}
```

---

## BuiltInToolInfo

Returned by `client.rpc.tools.list()`:

```ts
interface BuiltInToolInfo {
  name: string;
  namespacedName?: string;
  description: string;
  parameters?: Record<string, unknown>;  // JSON Schema
  instructions?: string;
}
```

---

## AuthStatus

Returned by `client.getAuthStatus()`:

```ts
interface AuthStatus {
  isAuthenticated: boolean;
  authType?: "user" | "env" | "gh-cli" | "hmac" | "api-key" | "token";
  host?: string;
  login?: string;
  statusMessage?: string;
}
```

---

## CopilotClientOptions

See [api-surface.md](./api-surface.md) for the constructor shape.

---

## BYOK Provider Config

```ts
interface BYOKProviderConfig {
  baseUrl: string;
  apiKey: string;
  modelMapping?: Record<string, string>;
}
```
