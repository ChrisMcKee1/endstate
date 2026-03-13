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
  BLOCKED: "blocked",
  RESOLVED: "resolved",
  DEFERRED: "deferred",
  WONT_FIX: "wont-fix",
} as const;

export type TaskStatus = (typeof TASK_STATUSES)[keyof typeof TASK_STATUSES];

export const AGENT_ROLES = {
  RESEARCHER: "researcher",
  EXPLORER: "explorer",
  ANALYST: "analyst",
  FIXER: "fixer",
  ANALYST_UI: "analyst-ui",
  ANALYST_BACKEND: "analyst-backend",
  ANALYST_DATABASE: "analyst-database",
  ANALYST_DOCS: "analyst-docs",
  FIXER_UI: "fixer-ui",
  FIXER_BACKEND: "fixer-backend",
  FIXER_DATABASE: "fixer-database",
  FIXER_DOCS: "fixer-docs",
  CONSOLIDATOR: "consolidator",
  UX_REVIEWER: "ux-reviewer",
  CODE_SIMPLIFIER: "code-simplifier",
} as const;

export type AgentRole = (typeof AGENT_ROLES)[keyof typeof AGENT_ROLES];

export const DOMAINS = {
  UI: "ui",
  BACKEND: "backend",
  DATABASE: "database",
  DOCS: "docs",
} as const;

export type Domain = (typeof DOMAINS)[keyof typeof DOMAINS];

const DOMAIN_ANALYST_MAP: Record<Domain, AgentRole> = {
  [DOMAINS.UI]: AGENT_ROLES.ANALYST_UI,
  [DOMAINS.BACKEND]: AGENT_ROLES.ANALYST_BACKEND,
  [DOMAINS.DATABASE]: AGENT_ROLES.ANALYST_DATABASE,
  [DOMAINS.DOCS]: AGENT_ROLES.ANALYST_DOCS,
};

const DOMAIN_FIXER_MAP: Record<Domain, AgentRole> = {
  [DOMAINS.UI]: AGENT_ROLES.FIXER_UI,
  [DOMAINS.BACKEND]: AGENT_ROLES.FIXER_BACKEND,
  [DOMAINS.DATABASE]: AGENT_ROLES.FIXER_DATABASE,
  [DOMAINS.DOCS]: AGENT_ROLES.FIXER_DOCS,
};

const ROLE_TO_DOMAIN: Partial<Record<AgentRole, Domain>> = {
  [AGENT_ROLES.ANALYST_UI]: DOMAINS.UI,
  [AGENT_ROLES.FIXER_UI]: DOMAINS.UI,
  [AGENT_ROLES.ANALYST_BACKEND]: DOMAINS.BACKEND,
  [AGENT_ROLES.FIXER_BACKEND]: DOMAINS.BACKEND,
  [AGENT_ROLES.ANALYST_DATABASE]: DOMAINS.DATABASE,
  [AGENT_ROLES.FIXER_DATABASE]: DOMAINS.DATABASE,
  [AGENT_ROLES.ANALYST_DOCS]: DOMAINS.DOCS,
  [AGENT_ROLES.FIXER_DOCS]: DOMAINS.DOCS,
};

export function getDomainFromRole(role: AgentRole): Domain | null {
  return ROLE_TO_DOMAIN[role] ?? null;
}

export function isAnalystRole(role: AgentRole): boolean {
  return role.startsWith("analyst-");
}

export function isFixerRole(role: AgentRole): boolean {
  return role.startsWith("fixer-");
}

export function getAnalystForDomain(domain: Domain): AgentRole {
  return DOMAIN_ANALYST_MAP[domain];
}

export function getFixerForDomain(domain: Domain): AgentRole {
  return DOMAIN_FIXER_MAP[domain];
}

export function getDomainRoles(domain: Domain): { analyst: AgentRole; fixer: AgentRole } {
  return {
    analyst: DOMAIN_ANALYST_MAP[domain],
    fixer: DOMAIN_FIXER_MAP[domain],
  };
}

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

export const PIPELINE_ACTIONS = {
  STARTING: "starting",
  STOPPING: "stopping",
} as const;

export type PipelineAction =
  (typeof PIPELINE_ACTIONS)[keyof typeof PIPELINE_ACTIONS];

export const CONNECTION_STATES = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error",
} as const;

export type ConnectionState =
  (typeof CONNECTION_STATES)[keyof typeof CONNECTION_STATES];

export const SESSION_EVENT_TYPES = {
  ASSISTANT_MESSAGE_DELTA: "assistant.message_delta",
  ASSISTANT_MESSAGE: "assistant.message",
  ASSISTANT_REASONING_DELTA: "assistant.reasoning_delta",
  ASSISTANT_REASONING: "assistant.reasoning",
  ASSISTANT_USAGE: "assistant.usage",
  ASSISTANT_TURN_START: "assistant.turn_start",
  ASSISTANT_TURN_END: "assistant.turn_end",
  ASSISTANT_INTENT: "assistant.intent",
  SESSION_START: "session.start",
  SESSION_IDLE: "session.idle",
  SESSION_ERROR: "session.error",
  SESSION_SHUTDOWN: "session.shutdown",
  SESSION_COMPACTION_START: "session.compaction_start",
  SESSION_COMPACTION_COMPLETE: "session.compaction_complete",
  SESSION_USAGE_INFO: "session.usage_info",
  SESSION_MODEL_CHANGE: "session.model_change",
  SESSION_TRUNCATION: "session.truncation",
  TOOL_EXECUTION_START: "tool.execution_start",
  TOOL_EXECUTION_COMPLETE: "tool.execution_complete",
  TOOL_EXECUTION_PROGRESS: "tool.execution_progress",
  PERMISSION_REQUEST: "permission.request",
  PIPELINE_STATE_CHANGE: "pipeline.state_change",
  PIPELINE_CYCLE_START: "pipeline.cycle_start",
  PIPELINE_CYCLE_END: "pipeline.cycle_end",
  AGENT_START: "agent.start",
  AGENT_END: "agent.end",
  STEERING_RECEIVED: "steering.received",
  HEARTBEAT: "heartbeat",
  SUBAGENT_STARTED: "subagent.started",
  SUBAGENT_COMPLETED: "subagent.completed",
  SUBAGENT_FAILED: "subagent.failed",
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
  /** Why this status was set — required for blocked, deferred, wont-fix */
  statusReason?: string;
  component: string;
  cycle: number;
  files: string[];
  tags: string[];
  /** Workstream domains this task touches (ui, backend, database, docs) */
  domains: Domain[];
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
  enableResearcher: boolean;
  enableCodeSimplifier: boolean;
  enableConsolidator: boolean;
  enableDomainUI: boolean;
  enableDomainBackend: boolean;
  enableDomainDatabase: boolean;
  enableDomainDocs: boolean;
  enableWorktreeIsolation: boolean;
  /** Agent execution graph: defines run order, parallelization, and loop-back */
  agentGraph: AgentGraphNode[];
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
  activeAgents: AgentRole[];
  activeDomains: Domain[];
  completedAgents: AgentRole[];
  runId: string | null;
  researcherCheatSheet?: string;
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

// ─── Agent Pipeline Graph ─────────────────────────────────────────────────────

export const GRAPH_NODE_TYPES = {
  /** Runs once at pipeline start, never loops */
  ENTRY: "entry",
  /** Standard node in the cycle loop */
  CYCLE: "cycle",
  /** Fan-out point: downstream domain nodes run in parallel */
  FAN_OUT: "fan-out",
  /** Fan-in point: waits for all parallel domain streams to complete */
  FAN_IN: "fan-in",
  /** Convergence gate: decides CONTINUE/STOP */
  GATE: "gate",
  /** Always-last node before loop-back */
  EXIT: "exit",
} as const;

export type GraphNodeType =
  (typeof GRAPH_NODE_TYPES)[keyof typeof GRAPH_NODE_TYPES];

export interface AgentGraphNode {
  /** Agent role identifier */
  role: AgentRole;
  /** Node type determines execution behavior */
  nodeType: GraphNodeType;
  /** Run after these agent roles complete (empty = can start immediately) */
  runAfter: AgentRole[];
  /** Whether this node can run in parallel with siblings that share the same runAfter */
  parallel: boolean;
  /** Whether this agent is enabled */
  enabled: boolean;
  /** Domain scope for analyst/fixer pairs */
  domain?: Domain;
  /** Role this node hands off to (analyst -> fixer chain) */
  handoffTo?: AgentRole;
  /** Whether this node's enablement is determined dynamically per cycle by the Explorer */
  dynamicEnable?: boolean;
}

/**
 * Default pipeline graph:
 * Researcher (entry)
 *   → Explorer (fan-out, identifies active domains)
 *     → [Analyst-UI → Fixer-UI]     \
 *     → [Analyst-Backend → Fixer-Backend]  } parallel, dynamically enabled
 *     → [Analyst-Database → Fixer-Database]  /
 *     → [Analyst-Docs → Fixer-Docs]   /
 *   → Consolidator (fan-in, merges worktrees, CONTINUE/STOP gate)
 *   → Code Simplifier
 *   → UX Reviewer (exit, loops back to Explorer)
 */
export const DEFAULT_AGENT_GRAPH: AgentGraphNode[] = [
  // Entry: Researcher runs once
  {
    role: AGENT_ROLES.RESEARCHER,
    nodeType: GRAPH_NODE_TYPES.ENTRY,
    runAfter: [],
    parallel: false,
    enabled: true,
  },
  // Fan-out: Explorer identifies which domains need work
  {
    role: AGENT_ROLES.EXPLORER,
    nodeType: GRAPH_NODE_TYPES.FAN_OUT,
    runAfter: [AGENT_ROLES.RESEARCHER],
    parallel: false,
    enabled: true,
  },
  // Domain: UI stream
  {
    role: AGENT_ROLES.ANALYST_UI,
    nodeType: GRAPH_NODE_TYPES.CYCLE,
    runAfter: [AGENT_ROLES.EXPLORER],
    parallel: true,
    enabled: true,
    domain: DOMAINS.UI,
    handoffTo: AGENT_ROLES.FIXER_UI,
    dynamicEnable: true,
  },
  {
    role: AGENT_ROLES.FIXER_UI,
    nodeType: GRAPH_NODE_TYPES.CYCLE,
    runAfter: [AGENT_ROLES.ANALYST_UI],
    parallel: false,
    enabled: true,
    domain: DOMAINS.UI,
    dynamicEnable: true,
  },
  // Domain: Backend stream
  {
    role: AGENT_ROLES.ANALYST_BACKEND,
    nodeType: GRAPH_NODE_TYPES.CYCLE,
    runAfter: [AGENT_ROLES.EXPLORER],
    parallel: true,
    enabled: true,
    domain: DOMAINS.BACKEND,
    handoffTo: AGENT_ROLES.FIXER_BACKEND,
    dynamicEnable: true,
  },
  {
    role: AGENT_ROLES.FIXER_BACKEND,
    nodeType: GRAPH_NODE_TYPES.CYCLE,
    runAfter: [AGENT_ROLES.ANALYST_BACKEND],
    parallel: false,
    enabled: true,
    domain: DOMAINS.BACKEND,
    dynamicEnable: true,
  },
  // Domain: Database stream
  {
    role: AGENT_ROLES.ANALYST_DATABASE,
    nodeType: GRAPH_NODE_TYPES.CYCLE,
    runAfter: [AGENT_ROLES.EXPLORER],
    parallel: true,
    enabled: true,
    domain: DOMAINS.DATABASE,
    handoffTo: AGENT_ROLES.FIXER_DATABASE,
    dynamicEnable: true,
  },
  {
    role: AGENT_ROLES.FIXER_DATABASE,
    nodeType: GRAPH_NODE_TYPES.CYCLE,
    runAfter: [AGENT_ROLES.ANALYST_DATABASE],
    parallel: false,
    enabled: true,
    domain: DOMAINS.DATABASE,
    dynamicEnable: true,
  },
  // Domain: Docs stream
  {
    role: AGENT_ROLES.ANALYST_DOCS,
    nodeType: GRAPH_NODE_TYPES.CYCLE,
    runAfter: [AGENT_ROLES.EXPLORER],
    parallel: true,
    enabled: true,
    domain: DOMAINS.DOCS,
    handoffTo: AGENT_ROLES.FIXER_DOCS,
    dynamicEnable: true,
  },
  {
    role: AGENT_ROLES.FIXER_DOCS,
    nodeType: GRAPH_NODE_TYPES.CYCLE,
    runAfter: [AGENT_ROLES.ANALYST_DOCS],
    parallel: false,
    enabled: true,
    domain: DOMAINS.DOCS,
    dynamicEnable: true,
  },
  // Fan-in: Consolidator merges worktrees and decides CONTINUE/STOP
  {
    role: AGENT_ROLES.CONSOLIDATOR,
    nodeType: GRAPH_NODE_TYPES.GATE,
    runAfter: [
      AGENT_ROLES.FIXER_UI,
      AGENT_ROLES.FIXER_BACKEND,
      AGENT_ROLES.FIXER_DATABASE,
      AGENT_ROLES.FIXER_DOCS,
    ],
    parallel: false,
    enabled: true,
  },
  // Post-merge: Code Simplifier
  {
    role: AGENT_ROLES.CODE_SIMPLIFIER,
    nodeType: GRAPH_NODE_TYPES.CYCLE,
    runAfter: [AGENT_ROLES.CONSOLIDATOR],
    parallel: false,
    enabled: true,
  },
  // Exit: UX Reviewer is last before loop-back to Explorer
  {
    role: AGENT_ROLES.UX_REVIEWER,
    nodeType: GRAPH_NODE_TYPES.EXIT,
    runAfter: [AGENT_ROLES.CODE_SIMPLIFIER],
    parallel: false,
    enabled: true,
  },
];

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
  /** Workstream domains this task touches */
  domains?: Domain[];
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

// ─── Awards ───────────────────────────────────────────────────────────────────

export const AWARD_RARITIES = {
  COMMON: "common",
  UNCOMMON: "uncommon",
  RARE: "rare",
  EPIC: "epic",
  LEGENDARY: "legendary",
} as const;

export type AwardRarity = (typeof AWARD_RARITIES)[keyof typeof AWARD_RARITIES];

export const AWARD_SOURCES = {
  PREDEFINED: "predefined",
  AI_GENERATED: "ai-generated",
} as const;

export type AwardSource = (typeof AWARD_SOURCES)[keyof typeof AWARD_SOURCES];

export interface Award {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: AwardRarity;
  source: AwardSource;
  earnedAt: string;
  /** Color hex for glow effects */
  color: string;
  /** Optional agent associated with the award */
  agent?: AgentRole;
  /** Metric or stat that triggered the award */
  trigger?: string;
}
