import { EventEmitter } from "node:events";
import { v4 as uuid } from "uuid";
import { createAgentSession } from "@/lib/copilot/agents";
import { getAllTasks, getTaskCount } from "@/lib/pipeline/task-store";
import {
  recordCycleComplete,
  recordAgentTurn,
  recordAgentLatency,
  recordAgentTokens,
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
  runId: null,
  tasksSummary: { total: 0, open: 0, inProgress: 0, resolved: 0, deferred: 0 },
};

let abortController: AbortController | null = null;
let activeSession: { abort: () => Promise<void>; destroy: () => Promise<void> } | null = null;

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
): Promise<void> {
  if (signal.aborted) return;

  currentState.activeAgent = role;
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
    const session = await createAgentSession(role, config);
    activeSession = session;

    if (signal.aborted) {
      await session.destroy().catch(() => {});
      activeSession = null;
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

    session.on((event: { type: string; data?: Record<string, unknown> }) => {
      if (event.type === "assistant.usage" && event.data) {
        const cumulativeInput = (event.data.inputTokens as number) ?? 0;
        const cumulativeOutput = (event.data.outputTokens as number) ?? 0;
        const deltaInput = Math.max(0, cumulativeInput - lastInputTokens);
        const deltaOutput = Math.max(0, cumulativeOutput - lastOutputTokens);
        lastInputTokens = cumulativeInput;
        lastOutputTokens = cumulativeOutput;
        if (deltaInput > 0 || deltaOutput > 0) {
          recordAgentTokens(role, deltaInput, deltaOutput);
        }
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

      // Convergence check — Analyst gate node
      if (role === AGENT_ROLES.ANALYST && response?.data?.content) {
        const content = response.data.content.toUpperCase();
        if (content.includes("STOP")) {
          currentState.status = PIPELINE_STATUSES.STOPPED;
          emitStateChange();
        }
      }
    } finally {
      activeSession = null;
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
  }
}

// ─── Graph-based execution layer ──────────────────────────────────────────────

/** Execute a layer of ready nodes. Parallel nodes run concurrently via Promise.all. */
async function executeLayer(
  nodes: AgentGraphNode[],
  config: PipelineConfig,
  cycle: number,
  signal: AbortSignal,
): Promise<void> {
  // Separate parallel-eligible nodes from sequential ones
  const parallel = nodes.filter((n) => n.parallel);
  const sequential = nodes.filter((n) => !n.parallel);

  // Run parallel nodes concurrently
  if (parallel.length > 1) {
    await Promise.all(
      parallel.map(async (node) => {
        if (signal.aborted || currentState.status === PIPELINE_STATUSES.STOPPED) return;
        if (!isAgentEnabled(node.role, config)) return;
        await runAgent(node.role, config, cycle, signal);
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
): Promise<void> {
  const completed = new Set<AgentRole>();

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

  // Separate entry nodes (run once) from cycle nodes
  const entryNodes = graph.filter((n) => n.nodeType === GRAPH_NODE_TYPES.ENTRY);
  const cycleNodes = graph.filter((n) => n.nodeType !== GRAPH_NODE_TYPES.ENTRY);

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

    await executeGraph(cycleNodes, config, cycle, signal);

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
  emitStateChange();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function startPipeline(config: PipelineConfig): string {
  if (currentState.status === PIPELINE_STATUSES.RUNNING) {
    throw new Error("Pipeline is already running");
  }

  const runId = uuid();
  abortController = new AbortController();

  currentState = {
    status: PIPELINE_STATUSES.RUNNING,
    currentCycle: 0,
    activeAgent: null,
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
  if (activeSession) {
    activeSession.abort().catch(() => {});
    activeSession = null;
  }
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  currentState.status = PIPELINE_STATUSES.STOPPED;
  currentState.activeAgent = null;
  emitStateChange();
}

export function getPipelineState(): PipelineState {
  refreshTasksSummary();
  return { ...currentState };
}
