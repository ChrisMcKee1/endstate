# Copilot SDK — API Surface Reference

> Reverse-engineered from `@github/copilot-sdk` v0.1.30 TypeScript declarations.

## Exports

```ts
export { CopilotClient } from "./client.js";
export { CopilotSession, type AssistantMessageEvent } from "./session.js";
export { defineTool, approveAll } from "./types.js";
// + all type exports (see types-reference.md)
```

---

## CopilotClient

### Constructor

```ts
const client = new CopilotClient(options?: CopilotClientOptions);
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cliPath` | `string` | bundled CLI | Path to CLI executable |
| `cliArgs` | `string[]` | `[]` | Extra CLI arguments |
| `cwd` | `string` | `process.cwd()` | Working directory for CLI process |
| `port` | `number` | `0` (random) | TCP port (TCP mode only) |
| `useStdio` | `boolean` | `true` | Use stdio transport instead of TCP |
| `cliUrl` | `string` | — | Connect to existing server (no spawn). Format: `"host:port"`, `"http://host:port"`, or `"port"` |
| `logLevel` | `"none"\|"error"\|"warning"\|"info"\|"debug"\|"all"` | `"info"` | CLI log level |
| `autoStart` | `boolean` | `true` | Auto-start CLI on first use |
| `autoRestart` | `boolean` | `true` | Auto-restart on crash |
| `env` | `Record<string, string\|undefined>` | `process.env` | Environment variables for CLI process |
| `githubToken` | `string` | — | Explicit auth token (takes priority) |
| `useLoggedInUser` | `boolean` | `true` (false when githubToken set) | Use stored OAuth/gh CLI auth |

**Mutual exclusivity:** `cliUrl` cannot be used with `cliPath` or `useStdio`.

### Connection Lifecycle

```ts
await client.start();                           // Start CLI server + connect
const errors = await client.stop();             // Graceful shutdown (returns cleanup errors)
await client.forceStop();                       // SIGKILL, no cleanup
client.getState();                              // → "disconnected" | "connecting" | "connected" | "error"
```

### Health & Status

```ts
await client.ping(message?);                    // → { message, timestamp, protocolVersion? }
await client.getStatus();                       // → { version, protocolVersion }
await client.getAuthStatus();                   // → { isAuthenticated, authType?, host?, login?, statusMessage? }
```

`authType` values: `"user" | "env" | "gh-cli" | "hmac" | "api-key" | "token"`

### Sessions

```ts
const session = await client.createSession(config: SessionConfig);
const session = await client.resumeSession(sessionId: string, config: ResumeSessionConfig);
const sessions = await client.listSessions(filter?: SessionListFilter);
const lastId = await client.getLastSessionId();
await client.deleteSession(sessionId);
```

**SessionListFilter:** `{ cwd?, gitRoot?, repository?, branch? }`

**SessionMetadata** (returned by `listSessions`):
```ts
{
  sessionId: string;
  startTime: Date;
  modifiedTime: Date;
  summary?: string;
  isRemote: boolean;
  context?: { cwd, gitRoot?, repository?, branch? };
}
```

### Models

```ts
const models = await client.listModels();       // → ModelInfo[] (cached after first call)
```

See [types-reference.md](./types-reference.md) for `ModelInfo` shape.

### Server-Scoped RPC

```ts
// List all built-in tools with schemas
const tools = await client.rpc.tools.list({ model?: string });
// → { name, namespacedName?, description, parameters?, instructions? }[]

// Account quota
const quota = await client.rpc.account.getQuota();
// → quota snapshots (entitlement, used, remaining%, resetDate)
```

### TUI+Server Mode

```ts
const id = await client.getForegroundSessionId();
await client.setForegroundSessionId(sessionId);
```

### Lifecycle Events

```ts
const unsubscribe = client.on("session.created", (event) => { ... });
// Event types: "session.created" | "session.deleted" | "session.updated" | "session.foreground" | "session.background"
// Or subscribe to all:
const unsubscribe = client.on((event) => { ... });
```

---

## CopilotSession

### Messaging

```ts
const messageId = await session.send(options: MessageOptions);
const response = await session.sendAndWait(options: MessageOptions, timeout?: number);
// → AssistantMessageEvent | undefined (timeout default: 60000ms)
session.abort();                                // Cancel in-flight request
const history = await session.getMessages();    // → SessionEvent[]
await session.destroy();                        // Free resources
```

**MessageOptions:**
```ts
{
  prompt: string;
  attachments?: Array<
    | { type: "file"; path: string; displayName?: string }
    | { type: "directory"; path: string; displayName?: string }
    | { type: "selection"; filePath: string; displayName: string; selection?: { start: { line, character }, end: { line, character } }; text?: string }
  >;
  mode?: "enqueue" | "immediate";
}
```

### Model Switching

```ts
await session.setModel(model: string);          // Hot-swap model mid-session
```

### Event Subscription

```ts
// All events
const unsubscribe = session.on((event: SessionEvent) => { ... });
// Typed events
const unsubscribe = session.on("assistant.message", (event) => { ... });
```

See [session-events.md](./session-events.md) for all 40+ event types.

### Session-Scoped RPC

```ts
// Model
await session.rpc.model.getCurrent();
await session.rpc.model.switchTo({ modelId: string });

// Mode (interactive / plan / autopilot)
await session.rpc.mode.get();
await session.rpc.mode.set({ mode: "interactive" | "plan" | "autopilot" });

// Plan management
await session.rpc.plan.read();
await session.rpc.plan.update({ content: string });
await session.rpc.plan.delete();

// Workspace files (infinite sessions)
await session.rpc.workspace.listFiles();
await session.rpc.workspace.readFile({ path: string });
await session.rpc.workspace.createFile({ path: string, content: string });

// Fleet mode (multi-agent within single session)
await session.rpc.fleet.start({ prompt?: string });

// Agent switching (custom agents)
await session.rpc.agent.list();
await session.rpc.agent.getCurrent();
await session.rpc.agent.select({ name: string });
await session.rpc.agent.deselect();

// Manual compaction
await session.rpc.compaction.compact();
```

### Workspace Path

```ts
session.workspacePath;  // string | undefined — path to session workspace (infinite sessions only)
// Contains: checkpoints/, plan.md, files/
```

---

## defineTool

```ts
import { defineTool } from "@github/copilot-sdk";

const tool = defineTool<T>(name: string, config: {
  description?: string;
  parameters?: ZodSchema<T> | Record<string, unknown>;  // Zod schema or raw JSON Schema
  handler: (args: T, invocation: ToolInvocation) => Promise<unknown> | unknown;
  overridesBuiltInTool?: boolean;  // Required if name clashes with built-in
});
```

**ToolInvocation** passed to handler:
```ts
{ sessionId: string; toolCallId: string; toolName: string; arguments: unknown }
```

**Return types from handler:**
- Any JSON-serializable value (auto-wrapped)
- A string
- A `ToolResultObject`:
  ```ts
  {
    textResultForLlm: string;
    binaryResultsForLlm?: Array<{ data: string; mimeType: string; type: string; description?: string }>;
    resultType: "success" | "failure" | "rejected" | "denied";
    error?: string;
    sessionLog?: string;
    toolTelemetry?: Record<string, unknown>;
  }
  ```

---

## approveAll

```ts
import { approveAll } from "@github/copilot-sdk";
// Pre-built PermissionHandler that approves all requests
```
