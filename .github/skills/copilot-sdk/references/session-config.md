# Copilot SDK — Session Configuration Reference

> Complete `SessionConfig` and `ResumeSessionConfig` shapes, hooks, permissions, and MCP server configuration.

## SessionConfig

```ts
interface SessionConfig {
  // Identity
  sessionId?: string;              // Custom session ID for deterministic naming
  clientName?: string;             // SDK consumer identifier (User-Agent)
  configDir?: string;              // Override session state directory

  // Model
  model: string;                   // Model ID from listModels()
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";

  // Behavior
  streaming?: boolean;             // Token-by-token streaming (default: false)
  workingDirectory?: string;       // Working directory for shell tools

  // System prompt
  systemMessage?: {
    content: string;
    mode?: "append" | "replace";   // "append" adds to built-in, "replace" replaces entirely
  };

  // Tools
  tools?: ToolDefinition[];        // Custom tools via defineTool()
  availableTools?: string[];       // Allowlist of built-in tool names
  excludedTools?: string[];        // Blocklist of built-in tool names

  // MCP Servers
  mcpServers?: Record<string, McpLocalServerConfig | McpRemoteServerConfig>;

  // Custom Agents
  customAgents?: CustomAgentConfig[];

  // Skills
  skillDirectories?: string[];     // Paths to skill folders
  disabledSkills?: string[];       // Skills to disable

  // Infinite Sessions (context compaction)
  infiniteSessions?: {
    enabled: boolean;
    backgroundCompactionThreshold?: number;  // 0-1, default ~0.75
    bufferExhaustionThreshold?: number;      // 0-1, default ~0.90
  };

  // Auth
  provider?: BYOKProviderConfig;   // Bring Your Own Key
  onPermissionRequest?: PermissionHandler;
  onUserInputRequest?: UserInputHandler;

  // Hooks
  hooks?: SessionHooks;
}
```

## ResumeSessionConfig

Same as `SessionConfig` — all fields are reconfigurable on resume except `sessionId`.

---

## SessionHooks

Hooks intercept session events at lifecycle points. Return objects control behavior.

### onPreToolUse

```ts
onPreToolUse?: (
  input: { toolName: string; arguments: Record<string, unknown>; mcpServerName?: string },
  context: HookContext
) => Promise<{
  permissionDecision?: "allow" | "deny" | "ask-user";
  modifiedArgs?: Record<string, unknown>;
  additionalContext?: string;
  suppressOutput?: boolean;
}>;
```

**Use cases:** OTel span start, argument sanitization, tool-level access control.

### onPostToolUse

```ts
onPostToolUse?: (
  input: { toolName: string; arguments: Record<string, unknown> },
  result: unknown,
  context: HookContext
) => Promise<{
  modifiedResult?: unknown;
  additionalContext?: string;
  suppressOutput?: boolean;
}>;
```

**Use cases:** OTel span end, result filtering, logging.

### onUserPromptSubmitted

```ts
onUserPromptSubmitted?: (
  prompt: string,
  context: HookContext
) => Promise<{
  modifiedPrompt?: string;
  additionalContext?: string;
  suppressOutput?: boolean;
}>;
```

**Use cases:** Steering injection (`[DEVELOPER STEERING]: ...`), context enrichment.

### onSessionStart

```ts
onSessionStart?: (
  context: HookContext & { source: "startup" | "resume" | "new" }
) => Promise<{
  additionalContext?: string;
  modifiedConfig?: Partial<SessionConfig>;
}>;
```

**Use cases:** Logging session start, dynamic config based on state.

### onSessionEnd

```ts
onSessionEnd?: (
  context: HookContext & { reason: "complete" | "error" | "abort" | "timeout" | "user_exit" }
) => Promise<{
  suppressOutput?: boolean;
  cleanupActions?: string[];
  sessionSummary?: string;
}>;
```

**Use cases:** Cleanup, final metrics, session summary generation.

### onErrorOccurred

```ts
onErrorOccurred?: (
  error: { type: string; message: string; stack?: string },
  context: HookContext
) => Promise<{
  errorHandling?: "retry" | "skip" | "abort";
  retryCount?: number;
  userNotification?: string;
}>;
```

**Use cases:** Retry logic, error classification, user notification.

---

## Permission Handling

### PermissionHandler

```ts
type PermissionHandler = (
  request: PermissionRequest,
  invocation: ToolInvocation
) => PermissionResult | Promise<PermissionResult>;
```

### PermissionRequest

```ts
interface PermissionRequest {
  kind: "shell" | "write" | "mcp" | "read" | "url" | "custom-tool";
  // Additional fields vary by kind:
  command?: string;      // "shell"
  path?: string;         // "read" | "write"
  url?: string;          // "url"
  serverName?: string;   // "mcp"
  toolName?: string;     // "custom-tool"
}
```

### PermissionResult

```ts
interface PermissionResult {
  kind: "approved" | "denied-by-rules" | "denied-no-approval-rule-for-kind"
    | "denied-interactively-by-user" | "denied-error";
  message?: string;
}
```

### Convenience

```ts
import { approveAll } from "@github/copilot-sdk";
// approveAll returns { kind: "approved" } for every request
```

---

## MCP Server Configuration

### Local (stdio)

```ts
interface McpLocalServerConfig {
  type: "local" | "stdio";
  command: string;          // e.g., "npx"
  args?: string[];          // e.g., ["-y", "@anthropic/mcp-playwright"]
  env?: Record<string, string>;
  cwd?: string;
  tools?: string[] | ["*"];  // Tool filter, "*" = all
  timeout?: number;          // Connection timeout in ms
}
```

### Remote (HTTP/SSE)

```ts
interface McpRemoteServerConfig {
  type: "http" | "sse";
  url: string;
  headers?: Record<string, string>;
  tools?: string[] | ["*"];
  timeout?: number;
}
```

### Example — Endstate Defaults

```ts
const mcpServers = {
  playwright: {
    type: "stdio" as const,
    command: "npx",
    args: ["-y", "@anthropic/mcp-playwright"],
    tools: ["*"],
  },
  filesystem: {
    type: "stdio" as const,
    command: "npx",
    args: ["-y", "@anthropic/mcp-filesystem", projectPath],
    tools: ["*"],
  },
  github: {
    type: "stdio" as const,
    command: "npx",
    args: ["-y", "@anthropic/mcp-github"],
    tools: ["*"],
  },
};
```

---

## Custom Agent Configuration

```ts
interface CustomAgentConfig {
  name: string;             // Unique identifier
  displayName?: string;     // UI display name
  description?: string;     // Purpose description
  prompt: string;           // System prompt for this agent persona
  tools?: string[];         // Tool allowlist
  mcpServers?: Record<string, McpLocalServerConfig | McpRemoteServerConfig>;
  infer?: boolean;          // Allow model to infer when to use
}
```

---

## User Input Request (enables `ask_user` tool)

```ts
type UserInputHandler = (request: UserInputRequest) => Promise<string | undefined>;

interface UserInputRequest {
  question: string;
  choices?: string[];
  allowFreeform?: boolean;
}
```

When `onUserInputRequest` is provided, the built-in `ask_user` tool becomes available to agents.

---

## Infinite Sessions Configuration

```ts
infiniteSessions: {
  enabled: true,
  backgroundCompactionThreshold: 0.75,   // Start background compaction at 75%
  bufferExhaustionThreshold: 0.90,        // Urgent compaction at 90%
}
```

**Session workspace path:** `session.workspacePath` → contains `checkpoints/`, `plan.md`, `files/`.

**Manual compaction:** `session.rpc.compaction.compact()` — trigger immediately instead of waiting for threshold.
