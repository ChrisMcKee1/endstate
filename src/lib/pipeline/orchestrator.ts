import { EventEmitter } from "node:events";
import { v4 as uuid } from "uuid";
import { createAgentSession } from "@/lib/copilot/agents";
import { listModels } from "@/lib/copilot/client";
import { getAllTasks, getTaskCount, clearAllTasks } from "@/lib/pipeline/task-store";
import { clearCheatSheet, parseCheatSheet, setCheatSheet } from "@/lib/pipeline/cheat-sheet-store";
import { clearAwards } from "@/lib/pipeline/award-store";
import {
  createWorktree,
  mergeWorktree,
  cleanupAllWorktrees,
} from "@/lib/pipeline/worktree-manager";
import {
  recordCycleComplete,
  recordAgentTurn,
  recordAgentLatency,
  recordAgentTokens,
  recordCompaction,
  recordContextWindow,
  recordSessionShutdown,
  recordToolInvocation,
  setModelMaxContextTokens,
} from "@/lib/otel/metrics";
import {
  startPipelineCycleSpan,
  startAgentTurnSpan,
  endSpanOk,
  endSpanError,
} from "@/lib/otel/spans";
import type {
  PipelineConfig,
  PipelineState,
  AgentRole,
  AgentGraphNode,
  SSEEvent,
} from "@/lib/types";
import {
  AGENT_ROLES,
  PIPELINE_STATUSES,
  SESSION_EVENT_TYPES,
  SEVERITIES,
  TASK_STATUSES,
  GRAPH_NODE_TYPES,
  DEFAULT_AGENT_GRAPH,
  isFixerRole,
  getDomainFromRole,
} from "@/lib/types";

// ─── Severity ordering for threshold filtering ───────────────────────────────

const SEVERITY_ORDER: Record<string, number> = {
  [SEVERITIES.CRITICAL]: 0,
  [SEVERITIES.HIGH]: 1,
  [SEVERITIES.MEDIUM]: 2,
  [SEVERITIES.LOW]: 3,
};

// ─── Global state ─────────────────────────────────────────────────────────────

const emitter = new EventEmitter();
emitter.setMaxListeners(50);

let currentState: PipelineState = {
  status: PIPELINE_STATUSES.IDLE,
  currentCycle: 0,
  activeAgent: null,
  activeAgents: [],
  activeDomains: [],
  completedAgents: [],
  runId: null,
  tasksSummary: { total: 0, open: 0, inProgress: 0, resolved: 0, deferred: 0 },
};

let abortController: AbortController | null = null;
let activeSessions = new Map<AgentRole, { abort: () => Promise<void>; destroy: () => Promise<void> }>();
let activeConfig: PipelineConfig | null = null;

// ─── SSE broadcasting ────────────────────────────────────────────────────────

function broadcast(event: SSEEvent): void {
  emitter.emit("sse", event);
}

export function onSSE(listener: (event: SSEEvent) => void): () => void {
  emitter.on("sse", listener);
  return () => emitter.off("sse", listener);
}

function emitStateChange(): void {
  broadcast({
    type: SESSION_EVENT_TYPES.PIPELINE_STATE_CHANGE,
    timestamp: new Date().toISOString(),
    data: { state: { ...currentState } },
  });
}

function refreshTasksSummary(): void {
  const tasks = getAllTasks();
  currentState.tasksSummary = {
    total: tasks.length,
    open: tasks.filter((t) => t.status === TASK_STATUSES.OPEN).length,
    inProgress: tasks.filter((t) => t.status === TASK_STATUSES.IN_PROGRESS).length,
    resolved: tasks.filter((t) => t.status === TASK_STATUSES.RESOLVED).length,
    deferred: tasks.filter((t) => t.status === TASK_STATUSES.DEFERRED).length,
  };
}

// ─── Graph utilities ─────────────────────────────────────────────────────────

function resolveGraph(config: PipelineConfig): AgentGraphNode[] {
  const graph = config.agentGraph?.length > 0 ? config.agentGraph : DEFAULT_AGENT_GRAPH;
  return graph.filter((node) => node.enabled);
}

/** Get nodes whose runAfter dependencies have all completed */
function getReadyNodes(
  graph: AgentGraphNode[],
  completed: Set<AgentRole>,
): AgentGraphNode[] {
  return graph.filter(
    (node) =>
      !completed.has(node.role) &&
      node.runAfter.every((dep) => completed.has(dep)),
  );
}

function isAgentEnabled(role: AgentRole, config: PipelineConfig): boolean {
  switch (role) {
    case AGENT_ROLES.RESEARCHER:
      return config.enableResearcher ?? true;
    case AGENT_ROLES.EXPLORER:
      return config.enableExplorer;
    case AGENT_ROLES.ANALYST:
      return config.enableAnalyst;
    case AGENT_ROLES.FIXER:
      return config.enableFixer;
    case AGENT_ROLES.CONSOLIDATOR:
      return config.enableConsolidator ?? true;
    case AGENT_ROLES.ANALYST_UI:
    case AGENT_ROLES.FIXER_UI:
      return config.enableDomainUI ?? true;
    case AGENT_ROLES.ANALYST_BACKEND:
    case AGENT_ROLES.FIXER_BACKEND:
      return config.enableDomainBackend ?? true;
    case AGENT_ROLES.ANALYST_DATABASE:
    case AGENT_ROLES.FIXER_DATABASE:
      return config.enableDomainDatabase ?? true;
    case AGENT_ROLES.ANALYST_DOCS:
    case AGENT_ROLES.FIXER_DOCS:
      return config.enableDomainDocs ?? true;
    case AGENT_ROLES.UX_REVIEWER:
      return config.enableUxReviewer;
    case AGENT_ROLES.CODE_SIMPLIFIER:
      return config.enableCodeSimplifier ?? true;
    default:
      return true;
  }
}

// ─── Agent execution ──────────────────────────────────────────────────────────

async function runAgent(
  role: AgentRole,
  config: PipelineConfig,
  cycle: number,
  signal: AbortSignal,
  overrides?: { workingDirectory?: string },
): Promise<void> {
  if (signal.aborted) return;

  currentState.activeAgent = role;
  if (!currentState.activeAgents.includes(role)) {
    currentState.activeAgents = [...currentState.activeAgents, role];
  }
  // Track active domains from domain-specific agents
  const domain = getDomainFromRole(role);
  if (domain && !currentState.activeDomains.includes(domain)) {
    currentState.activeDomains = [...currentState.activeDomains, domain];
  }
  emitStateChange();

  broadcast({
    type: SESSION_EVENT_TYPES.AGENT_START,
    timestamp: new Date().toISOString(),
    agent: role,
    data: { cycle },
  });

  const turnSpan = startAgentTurnSpan(role, config.model, 0);
  const startTime = Date.now();

  try {
    const session = await createAgentSession(role, config, overrides);
    activeSessions.set(role, session);

    if (signal.aborted) {
      await session.destroy().catch(() => {});
      activeSessions.delete(role);
      return;
    }

    // Build the prompt
    const tasks = getAllTasks();
    const taskSummary = JSON.stringify(
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        severity: t.severity,
        status: t.status,
        component: t.component,
        timelineCount: t.timeline.length,
      })),
      null,
      2,
    );

    let prompt: string;
    if (role === AGENT_ROLES.RESEARCHER) {
      prompt = `Pipeline starting. Perform initial project research.\n\nExisting tasks (may be empty on first run):\n${taskSummary}`;
    } else if (role === AGENT_ROLES.FIXER) {
      const threshold = SEVERITY_ORDER[config.fixSeverity];
      const fixable = tasks.filter(
        (t) =>
          t.status !== TASK_STATUSES.RESOLVED &&
          t.status !== TASK_STATUSES.WONT_FIX &&
          SEVERITY_ORDER[t.severity] <= threshold,
      );
      prompt = `Cycle ${cycle}. Fix severity threshold: ${config.fixSeverity}.\n\nTasks eligible for fixing:\n${JSON.stringify(fixable.map((t) => ({ id: t.id, title: t.title, severity: t.severity })), null, 2)}\n\nAll tasks:\n${taskSummary}`;
    } else if (role === AGENT_ROLES.ANALYST) {
      prompt = `Cycle ${cycle}. Review and diagnose all tasks. After your analysis, state whether to CONTINUE or STOP.\n\nCurrent tasks:\n${taskSummary}`;
    } else if (role === AGENT_ROLES.CODE_SIMPLIFIER) {
      prompt = `Cycle ${cycle}. Review all code changes made this cycle. Simplify where possible.\n\nCurrent tasks:\n${taskSummary}`;
    } else {
      prompt = `Cycle ${cycle}. Current tasks:\n${taskSummary}`;
    }

    // Forward session events to SSE and capture token usage
    let lastInputTokens = 0;
    let lastOutputTokens = 0;
    let accumulatedText = "";

    // Create a promise that resolves when the session reports idle
    // (all tool calls finished, no pending work)
    let resolveIdle: () => void;
    const idlePromise = new Promise<void>((resolve) => { resolveIdle = resolve; });
    let idleResolved = false;

    session.on((event: { type: string; data?: Record<string, unknown> }) => {
      // session.idle = session has NO pending work — safe to destroy
      if (event.type === "session.idle" && !idleResolved) {
        idleResolved = true;
        resolveIdle();
      }
      if (event.type === "assistant.usage" && event.data) {
        const cumulativeInput = (event.data.inputTokens as number) ?? 0;
        const cumulativeOutput = (event.data.outputTokens as number) ?? 0;
        const cacheRead = (event.data.cacheReadTokens as number) ?? 0;
        const cacheWrite = (event.data.cacheWriteTokens as number) ?? 0;
        const deltaInput = Math.max(0, cumulativeInput - lastInputTokens);
        const deltaOutput = Math.max(0, cumulativeOutput - lastOutputTokens);
        lastInputTokens = cumulativeInput;
        lastOutputTokens = cumulativeOutput;
        if (deltaInput > 0 || deltaOutput > 0) {
          recordAgentTokens(role, deltaInput, deltaOutput, cacheRead, cacheWrite);
        }
      }
      // Context window state — feeds ContextMeter natively from SDK
      if (event.type === "session.usage_info" && event.data) {
        const tokenLimit = (event.data.tokenLimit as number) ?? 0;
        const currentTokens = (event.data.currentTokens as number) ?? 0;
        if (tokenLimit > 0) {
          recordContextWindow(tokenLimit, currentTokens);
        }
      }
      // Compaction events — connect to existing OTel counters
      if (event.type === "session.compaction_start") {
        recordCompaction();
      }
      // Session shutdown — capture end-of-session metrics
      if (event.type === "session.shutdown" && event.data) {
        recordSessionShutdown({
          premiumRequests: event.data.totalPremiumRequests as number | undefined,
          codeChanges: event.data.codeChanges as { linesAdded: number; linesRemoved: number; filesModified: number } | undefined,
        });
      }
      // Tool invocations — connect to existing OTel counter
      if (event.type === "tool.execution_start" && event.data) {
        const toolName = (event.data.toolName as string) ?? "unknown";
        recordToolInvocation(toolName);
      }
      // Accumulate streaming text for cheat sheet extraction
      if (event.type === "assistant.message_delta" && event.data) {
        const chunk = (event.data.content as string) ?? "";
        if (chunk) accumulatedText += chunk;
      }
      broadcast({
        type: event.type as SSEEvent["type"],
        timestamp: new Date().toISOString(),
        agent: role,
        data: (event.data as Record<string, unknown>) ?? {},
      });
    });

    try {
      const response = await session.sendAndWait({ prompt }, 1_800_000);

      const elapsed = (Date.now() - startTime) / 1000;
      recordAgentTurn(role);
      recordAgentLatency(role, elapsed);
      endSpanOk(turnSpan);

      broadcast({
        type: SESSION_EVENT_TYPES.AGENT_END,
        timestamp: new Date().toISOString(),
        agent: role,
        data: {
          cycle,
          durationSeconds: elapsed,
          response: response?.data?.content?.slice(0, 500) ?? null,
        },
      });

      // Immediately remove from activeAgents so the UI stops showing active state.
      // Session cleanup (idle wait, destroy) happens in the finally block,
      // but the agent's work is done once sendAndWait returns.
      currentState.activeAgents = currentState.activeAgents.filter((r) => r !== role);
      if (!currentState.completedAgents.includes(role)) {
        currentState.completedAgents = [...currentState.completedAgents, role];
      }
      const agentDomain = getDomainFromRole(role);
      if (agentDomain) {
        const domainStillActive = currentState.activeAgents.some((r) => getDomainFromRole(r) === agentDomain);
        if (!domainStillActive) {
          currentState.activeDomains = currentState.activeDomains.filter((d) => d !== agentDomain);
        }
      }
      emitStateChange();

      // Convergence check — gate nodes (Analyst or Consolidator)
      if (
        (role === AGENT_ROLES.ANALYST || role === AGENT_ROLES.CONSOLIDATOR) &&
        response?.data?.content
      ) {
        const content = response.data.content.toUpperCase();
        if (content.includes("STOP")) {
          currentState.status = PIPELINE_STATUSES.STOPPED;
          emitStateChange();
        }
      }

      // Extract cheat sheet from Researcher output
      if (role === AGENT_ROLES.RESEARCHER) {
        const responseText = (response?.data?.content as string) ?? accumulatedText;
        const extracted = parseCheatSheet(responseText);
        if (extracted) {
          setCheatSheet(config.projectPath, extracted);
          broadcast({
            type: SESSION_EVENT_TYPES.AGENT_END,
            timestamp: new Date().toISOString(),
            agent: role,
            data: { cheatSheetExtracted: true, cheatSheetLength: extracted.length },
          });
        } else if (accumulatedText && accumulatedText !== responseText) {
          // Fallback: try accumulated streaming text if sendAndWait response didn't contain delimiters
          const fallback = parseCheatSheet(accumulatedText);
          if (fallback) {
            setCheatSheet(config.projectPath, fallback);
          }
        }
      }
    } finally {
      // Wait for session.idle (all tool calls complete) before destroying
      // Use a timeout to avoid blocking forever if idle never fires
      if (!idleResolved) {
        await Promise.race([idlePromise, new Promise<void>((r) => setTimeout(r, 30_000))]);
      }
      activeSessions.delete(role);
      await session.destroy().catch(() => {});
    }
  } catch (err) {
    endSpanError(turnSpan, err instanceof Error ? err : new Error(String(err)));
    broadcast({
      type: SESSION_EVENT_TYPES.SESSION_ERROR,
      timestamp: new Date().toISOString(),
      agent: role,
      data: {
        error: err instanceof Error ? err.message : String(err),
        cycle,
      },
    });
    // Remove from activeAgents on error too
    currentState.activeAgents = currentState.activeAgents.filter((r) => r !== role);
    const errDomain = getDomainFromRole(role);
    if (errDomain) {
      const domainStillActive = currentState.activeAgents.some((r) => getDomainFromRole(r) === errDomain);
      if (!domainStillActive) {
        currentState.activeDomains = currentState.activeDomains.filter((d) => d !== errDomain);
      }
    }
    emitStateChange();
  }

  refreshTasksSummary();
  emitStateChange();
}

// ─── Graph-based execution layer ──────────────────────────────────────────────

/** Execute a layer of ready nodes. Parallel nodes run concurrently via Promise.all. */
async function executeLayer(
  nodes: AgentGraphNode[],
  config: PipelineConfig,
  cycle: number,
  signal: AbortSignal,
): Promise<void> {
  // When worktree isolation is enabled, fixers can run in parallel
  // because each gets its own isolated worktree directory.
  const useWorktrees = config.enableWorktreeIsolation;

  // Separate parallel-eligible nodes from sequential ones.
  // Fixers become parallel-eligible when worktree isolation is on.
  const parallel = nodes.filter((n) =>
    n.parallel || (useWorktrees && isFixerRole(n.role)),
  );
  const sequential = nodes.filter((n) =>
    !n.parallel && !(useWorktrees && isFixerRole(n.role)),
  );

  // Run parallel nodes concurrently
  if (parallel.length > 1) {
    await Promise.all(
      parallel.map(async (node) => {
        if (signal.aborted || currentState.status === PIPELINE_STATUSES.STOPPED) return;
        if (!isAgentEnabled(node.role, config)) return;

        // Create worktree for fixer agents so they don't conflict
        let overrides: { workingDirectory?: string } | undefined;
        if (useWorktrees && isFixerRole(node.role)) {
          const domain = getDomainFromRole(node.role);
          if (domain) {
            try {
              const wtPath = await createWorktree(config.projectPath, domain, cycle);
              overrides = { workingDirectory: wtPath };
            } catch (err) {
              // If worktree creation fails, fall back to main directory
              broadcast({
                type: SESSION_EVENT_TYPES.SESSION_ERROR,
                timestamp: new Date().toISOString(),
                agent: node.role,
                data: { error: `Worktree creation failed, using main directory: ${err instanceof Error ? err.message : String(err)}` },
              });
            }
          }
        }

        await runAgent(node.role, config, cycle, signal, overrides);
        refreshTasksSummary();
      }),
    );
  } else if (parallel.length === 1) {
    if (!signal.aborted && currentState.status !== PIPELINE_STATUSES.STOPPED) {
      if (isAgentEnabled(parallel[0].role, config)) {
        await runAgent(parallel[0].role, config, cycle, signal);
        refreshTasksSummary();
      }
    }
  }

  // Run sequential nodes one at a time
  for (const node of sequential) {
    if (signal.aborted || currentState.status === PIPELINE_STATUSES.STOPPED) break;
    if (!isAgentEnabled(node.role, config)) continue;

    // Consolidator: merge all worktrees before running
    if (useWorktrees && node.role === AGENT_ROLES.CONSOLIDATOR) {
      const domains = ["ui", "backend", "database", "docs"] as const;
      for (const domain of domains) {
        try {
          const result = await mergeWorktree(config.projectPath, domain);
          if (result.conflicts) {
            broadcast({
              type: SESSION_EVENT_TYPES.SESSION_ERROR,
              timestamp: new Date().toISOString(),
              agent: AGENT_ROLES.CONSOLIDATOR,
              data: { error: `Merge conflict in ${domain} worktree — manual resolution may be needed` },
            });
          }
        } catch {
          // Worktree may not exist if that domain was disabled
        }
      }
    }

    await runAgent(node.role, config, cycle, signal);
    refreshTasksSummary();
  }
}

/** Walk the agent graph level-by-level using topological ordering */
async function executeGraph(
  graph: AgentGraphNode[],
  config: PipelineConfig,
  cycle: number,
  signal: AbortSignal,
  preCompleted?: Set<AgentRole>,
): Promise<void> {
  const completed = new Set<AgentRole>(preCompleted);

  // Mark disabled agents as already completed so they don't block deps
  for (const node of graph) {
    if (!isAgentEnabled(node.role, config)) {
      completed.add(node.role);
    }
  }

  while (completed.size < graph.length) {
    if (signal.aborted || currentState.status === PIPELINE_STATUSES.STOPPED) break;

    const ready = getReadyNodes(graph, completed);
    if (ready.length === 0) break; // No progress possible — avoid infinite loop

    await executeLayer(ready, config, cycle, signal);

    // Mark all ready nodes as completed (including disabled ones)
    for (const node of ready) {
      completed.add(node.role);
    }
  }
}

// ─── Convergence check ───────────────────────────────────────────────────────

function shouldContinue(config: PipelineConfig): boolean {
  if (currentState.status === PIPELINE_STATUSES.STOPPED) return false;
  if (currentState.currentCycle >= config.maxCycles) return false;
  return true;
}

// ─── Pipeline loop ────────────────────────────────────────────────────────────

async function runPipeline(config: PipelineConfig): Promise<void> {
  const signal = abortController!.signal;
  const graph = resolveGraph(config);

  // Look up the selected model's context window from SDK metadata
  try {
    const models = await listModels();
    const selected = models.find(
      (m: { id: string; capabilities?: { limits?: { max_context_window_tokens?: number } } }) =>
        m.id === config.model,
    );
    const maxContext = selected?.capabilities?.limits?.max_context_window_tokens;
    if (maxContext && maxContext > 0) {
      setModelMaxContextTokens(maxContext);
    }
  } catch {
    // Non-fatal — bar will use fallback scale
  }

  // Separate entry nodes (run once) from cycle nodes
  const entryNodes = graph.filter((n) => n.nodeType === GRAPH_NODE_TYPES.ENTRY);
  const cycleNodes = graph.filter((n) => n.nodeType !== GRAPH_NODE_TYPES.ENTRY);

  // Collect entry roles so cycle execution knows they already completed
  const entryRoles = new Set(entryNodes.map((n) => n.role));

  // Phase 1: Run entry agents once (e.g., Researcher)
  if (entryNodes.length > 0 && !signal.aborted) {
    await executeGraph(entryNodes, config, 0, signal);
    refreshTasksSummary();
  }

  // Phase 2: Cycle loop — run cycle/gate/exit nodes in graph order
  while (shouldContinue(config) && !signal.aborted) {
    currentState.currentCycle++;
    const cycle = currentState.currentCycle;

    const cycleSpan = startPipelineCycleSpan(cycle, getTaskCount());

    broadcast({
      type: SESSION_EVENT_TYPES.PIPELINE_CYCLE_START,
      timestamp: new Date().toISOString(),
      data: { cycle },
    });

    await executeGraph(cycleNodes, config, cycle, signal, entryRoles);

    recordCycleComplete();
    endSpanOk(cycleSpan);

    broadcast({
      type: SESSION_EVENT_TYPES.PIPELINE_CYCLE_END,
      timestamp: new Date().toISOString(),
      data: { cycle, tasksSummary: { ...currentState.tasksSummary } },
    });
  }

  // Final state
  if (currentState.status !== PIPELINE_STATUSES.ERROR) {
    currentState.status = PIPELINE_STATUSES.STOPPED;
  }
  currentState.activeAgent = null;
  currentState.activeAgents = [];
  currentState.activeDomains = [];
  activeSessions.clear();

  // Clean up any remaining worktrees
  if (config.enableWorktreeIsolation) {
    await cleanupAllWorktrees(config.projectPath).catch(() => {});
  }

  emitStateChange();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function startPipeline(config: PipelineConfig, options?: { resume?: boolean }): string {
  if (currentState.status === PIPELINE_STATUSES.RUNNING) {
    throw new Error("Pipeline is already running");
  }

  const runId = uuid();
  abortController = new AbortController();
  activeConfig = config;

  const isResume = options?.resume === true;

  if (!isResume) {
    // Fresh run: clear previous state
    clearAllTasks();
    clearCheatSheet(config.projectPath);
    clearAwards();
  }
  // Resume: keep existing tasks, cheat sheet, and awards

  currentState = {
    status: PIPELINE_STATUSES.RUNNING,
    currentCycle: isResume ? (currentState.currentCycle || 0) : 0,
    activeAgent: null,
    activeAgents: [],
    activeDomains: [],
    completedAgents: [],
    runId,
    tasksSummary: { total: 0, open: 0, inProgress: 0, resolved: 0, deferred: 0 },
  };

  refreshTasksSummary();
  emitStateChange();

  runPipeline(config).catch((err) => {
    currentState.status = PIPELINE_STATUSES.ERROR;
    currentState.activeAgent = null;
    broadcast({
      type: SESSION_EVENT_TYPES.SESSION_ERROR,
      timestamp: new Date().toISOString(),
      data: { error: err instanceof Error ? err.message : String(err) },
    });
    emitStateChange();
  });

  return runId;
}

export function stopPipeline(): void {
  // Abort all active sessions
  for (const [, session] of activeSessions) {
    session.abort().catch(() => {});
  }
  activeSessions.clear();
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  // Clean up worktrees
  if (activeConfig?.enableWorktreeIsolation) {
    cleanupAllWorktrees(activeConfig.projectPath).catch(() => {});
  }
  activeConfig = null;
  currentState.status = PIPELINE_STATUSES.STOPPED;
  currentState.activeAgent = null;
  currentState.activeAgents = [];
  currentState.activeDomains = [];
  emitStateChange();
}

export function getPipelineState(): PipelineState {
  refreshTasksSummary();
  return { ...currentState };
}
