import { EventEmitter } from "node:events";
import { v4 as uuid } from "uuid";
import { createAgentSession } from "@/lib/copilot/agents";
import { getAllTasks, getTaskCount } from "@/lib/pipeline/task-store";
import {
  recordCycleComplete,
  recordAgentTurn,
  recordAgentLatency,
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
  SSEEvent,
} from "@/lib/types";
import {
  AGENT_ROLES,
  PIPELINE_STATUSES,
  SESSION_EVENT_TYPES,
  SEVERITIES,
  TASK_STATUSES,
} from "@/lib/types";

// ─── Severity ordering for threshold filtering ───────────────────────────────

const SEVERITY_ORDER = {
  [SEVERITIES.CRITICAL]: 0,
  [SEVERITIES.HIGH]: 1,
  [SEVERITIES.MEDIUM]: 2,
  [SEVERITIES.LOW]: 3,
} as const;

// ─── Global state ─────────────────────────────────────────────────────────────

const emitter = new EventEmitter();
emitter.setMaxListeners(50); // Allow many SSE subscribers

let currentState: PipelineState = {
  status: PIPELINE_STATUSES.IDLE,
  currentCycle: 0,
  activeAgent: null,
  runId: null,
  tasksSummary: { total: 0, open: 0, inProgress: 0, resolved: 0, deferred: 0 },
};

let abortController: AbortController | null = null;

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
    inProgress: tasks.filter((t) => t.status === TASK_STATUSES.IN_PROGRESS)
      .length,
    resolved: tasks.filter((t) => t.status === TASK_STATUSES.RESOLVED).length,
    deferred: tasks.filter((t) => t.status === TASK_STATUSES.DEFERRED).length,
  };
}

// ─── Agent execution ──────────────────────────────────────────────────────────

const AGENT_SEQUENCE: AgentRole[] = [
  AGENT_ROLES.EXPLORER,
  AGENT_ROLES.ANALYST,
  AGENT_ROLES.FIXER,
  AGENT_ROLES.UX_REVIEWER,
];

function isAgentEnabled(role: AgentRole, config: PipelineConfig): boolean {
  switch (role) {
    case AGENT_ROLES.EXPLORER:
      return config.enableExplorer;
    case AGENT_ROLES.ANALYST:
      return config.enableAnalyst;
    case AGENT_ROLES.FIXER:
      return config.enableFixer;
    case AGENT_ROLES.UX_REVIEWER:
      return config.enableUxReviewer;
  }
}

async function runAgent(
  role: AgentRole,
  config: PipelineConfig,
  cycle: number,
  signal: AbortSignal
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

    // Build the prompt for this agent's turn
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
      2
    );

    let prompt: string;
    if (role === AGENT_ROLES.FIXER) {
      const threshold = SEVERITY_ORDER[config.fixSeverity];
      const fixable = tasks.filter(
        (t) =>
          t.status !== TASK_STATUSES.RESOLVED &&
          t.status !== TASK_STATUSES.WONT_FIX &&
          SEVERITY_ORDER[t.severity] <= threshold
      );
      prompt = `Cycle ${cycle}. Fix severity threshold: ${config.fixSeverity}.\n\nTasks eligible for fixing:\n${JSON.stringify(fixable.map((t) => ({ id: t.id, title: t.title, severity: t.severity })), null, 2)}\n\nAll tasks:\n${taskSummary}`;
    } else if (role === AGENT_ROLES.ANALYST) {
      prompt = `Cycle ${cycle}. Review and diagnose all tasks. After your analysis, state whether to CONTINUE or STOP.\n\nCurrent tasks:\n${taskSummary}`;
    } else {
      prompt = `Cycle ${cycle}. Current tasks:\n${taskSummary}`;
    }

    // Forward session events to SSE
    session.on((event: { type: string; data?: Record<string, unknown> }) => {
      broadcast({
        type: event.type as SSEEvent["type"],
        timestamp: new Date().toISOString(),
        agent: role,
        data: (event.data as Record<string, unknown>) ?? {},
      });
    });

    const response = await session.sendAndWait({ prompt });

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

    // Check for convergence in Analyst response
    if (role === AGENT_ROLES.ANALYST && response?.data?.content) {
      const content = response.data.content.toUpperCase();
      if (content.includes("STOP")) {
        currentState.status = PIPELINE_STATUSES.STOPPED;
        emitStateChange();
      }
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

// ─── Convergence check ───────────────────────────────────────────────────────

function shouldContinue(config: PipelineConfig): boolean {
  if (currentState.status === PIPELINE_STATUSES.STOPPED) return false;
  if (currentState.currentCycle >= config.maxCycles) return false;
  return true;
}

// ─── Pipeline loop ────────────────────────────────────────────────────────────

async function runPipeline(config: PipelineConfig): Promise<void> {
  const signal = abortController!.signal;

  while (shouldContinue(config) && !signal.aborted) {
    currentState.currentCycle++;
    const cycle = currentState.currentCycle;

    const cycleSpan = startPipelineCycleSpan(cycle, getTaskCount());

    broadcast({
      type: SESSION_EVENT_TYPES.PIPELINE_CYCLE_START,
      timestamp: new Date().toISOString(),
      data: { cycle },
    });

    for (const role of AGENT_SEQUENCE) {
      if (signal.aborted) break;
      if (!isAgentEnabled(role, config)) continue;
      await runAgent(role, config, cycle, signal);
      refreshTasksSummary();

      // If Analyst said STOP, break out of the agent sequence
      if (currentState.status === PIPELINE_STATUSES.STOPPED) break;
    }

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

  // Fire-and-forget — pipeline runs in background
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
