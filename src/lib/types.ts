// ─── Constants (as const + derived union types) ───────────────────────────────

export const SEVERITIES = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;

export type Severity = (typeof SEVERITIES)[keyof typeof SEVERITIES];

export const TASK_STATUSES = {
  OPEN: "open",
  IN_PROGRESS: "in-progress",
  RESOLVED: "resolved",
  DEFERRED: "deferred",
  WONT_FIX: "wont-fix",
} as const;

export type TaskStatus = (typeof TASK_STATUSES)[keyof typeof TASK_STATUSES];

export const AGENT_ROLES = {
  EXPLORER: "explorer",
  ANALYST: "analyst",
  FIXER: "fixer",
  UX_REVIEWER: "ux-reviewer",
} as const;

export type AgentRole = (typeof AGENT_ROLES)[keyof typeof AGENT_ROLES];

export const TASK_ACTIONS = {
  DISCOVERED: "discovered",
  DIAGNOSED: "diagnosed",
  FIXED: "fixed",
  VERIFIED: "verified",
  FLAGGED: "flagged",
  DEFERRED: "deferred",
  REGRESSION: "regression",
} as const;

export type TaskAction = (typeof TASK_ACTIONS)[keyof typeof TASK_ACTIONS];

export const PIPELINE_STATUSES = {
  IDLE: "idle",
  RUNNING: "running",
  PAUSED: "paused",
  STOPPED: "stopped",
  ERROR: "error",
} as const;

export type PipelineStatus =
  (typeof PIPELINE_STATUSES)[keyof typeof PIPELINE_STATUSES];

export const SESSION_EVENT_TYPES = {
  ASSISTANT_MESSAGE_DELTA: "assistant.message_delta",
  ASSISTANT_MESSAGE: "assistant.message",
  ASSISTANT_REASONING_DELTA: "assistant.reasoning_delta",
  ASSISTANT_REASONING: "assistant.reasoning",
  SESSION_IDLE: "session.idle",
  SESSION_ERROR: "session.error",
  SESSION_COMPACTION_START: "session.compaction_start",
  SESSION_COMPACTION_COMPLETE: "session.compaction_complete",
  TOOL_EXECUTION_START: "tool.execution_start",
  TOOL_EXECUTION_COMPLETE: "tool.execution_complete",
  PERMISSION_REQUEST: "permission.request",
  PIPELINE_STATE_CHANGE: "pipeline.state_change",
  PIPELINE_CYCLE_START: "pipeline.cycle_start",
  PIPELINE_CYCLE_END: "pipeline.cycle_end",
  AGENT_START: "agent.start",
  AGENT_END: "agent.end",
  STEERING_RECEIVED: "steering.received",
  HEARTBEAT: "heartbeat",
} as const;

export type SessionEventType =
  (typeof SESSION_EVENT_TYPES)[keyof typeof SESSION_EVENT_TYPES];

// ─── Data Models ──────────────────────────────────────────────────────────────

export interface TaskEvent {
  agent: AgentRole;
  action: TaskAction;
  timestamp: string;
  cycle: number;
  detail: string;
  expected?: string;
  actual?: string;
  reasoning?: string;
  diff?: string;
  buildResult?: "pass" | "fail";
  screenshot?: string;
  otelTraceId?: string;
}

export interface Task {
  id: string;
  title: string;
  severity: Severity;
  status: TaskStatus;
  component: string;
  cycle: number;
  files: string[];
  tags: string[];
  timeline: TaskEvent[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface PipelineConfig {
  projectPath: string;
  appUrl: string;
  inspiration: string;
  maxCycles: number;
  model: string;
  autoApprove: boolean;
  infiniteSessions: boolean;
  fixSeverity: Severity;
  enableExplorer: boolean;
  enableAnalyst: boolean;
  enableFixer: boolean;
  enableUxReviewer: boolean;
  reasoningEffort?: ReasoningEffort;
  skills: SkillDefinition[];
  customAgentDefinitions: CustomAgentDefinition[];
  mcpServerOverrides: McpServerEntry[];
  toolOverrides: ToolEntry[];
}

export interface PipelineState {
  status: PipelineStatus;
  currentCycle: number;
  activeAgent: AgentRole | null;
  runId: string | null;
  tasksSummary: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    deferred: number;
  };
}

export interface SteeringMessage {
  id: string;
  message: string;
  timestamp: string;
}

export interface SSEEvent {
  type: SessionEventType;
  timestamp: string;
  agent?: AgentRole;
  data: Record<string, unknown>;
}

// ─── Customization Types ──────────────────────────────────────────────────────

export const REASONING_EFFORTS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  XHIGH: "xhigh",
} as const;

export type ReasoningEffort =
  (typeof REASONING_EFFORTS)[keyof typeof REASONING_EFFORTS];

export const SKILL_SOURCES = {
  LOCAL: "local",
  IMPORTED: "imported",
} as const;

export type SkillSource = (typeof SKILL_SOURCES)[keyof typeof SKILL_SOURCES];

export const MCP_SERVER_TYPES = {
  STDIO: "stdio",
  HTTP: "http",
} as const;

export type McpServerType =
  (typeof MCP_SERVER_TYPES)[keyof typeof MCP_SERVER_TYPES];

export const TOOL_TYPES = {
  BUILTIN: "builtin",
  CUSTOM: "custom",
} as const;

export type ToolType = (typeof TOOL_TYPES)[keyof typeof TOOL_TYPES];

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  filePath: string;
  enabled: boolean;
  assignedAgents: AgentRole[];
  source: SkillSource;
}

export interface CustomAgentDefinition {
  name: string;
  displayName: string;
  description: string;
  prompt: string;
  enabled: boolean;
}

export interface McpServerEntry {
  id: string;
  name: string;
  type: McpServerType;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
  tools?: string[];
  enabled: boolean;
  assignedAgents: AgentRole[];
}

export interface ToolEntry {
  name: string;
  type: ToolType;
  enabled: boolean;
}

// ─── API Request/Response Schemas ─────────────────────────────────────────────

export interface TaskCreateInput {
  title: string;
  severity: Severity;
  component: string;
  cycle: number;
  files?: string[];
  tags?: string[];
  agent: AgentRole;
  detail: string;
  expected?: string;
  actual?: string;
}

export interface TaskUpdateInput {
  taskId: string;
  status?: TaskStatus;
  agent: AgentRole;
  action: TaskAction;
  cycle: number;
  detail: string;
  expected?: string;
  actual?: string;
  reasoning?: string;
  diff?: string;
  buildResult?: "pass" | "fail";
  screenshot?: string;
  files?: string[];
  tags?: string[];
}
