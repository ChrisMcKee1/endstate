import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("endstate");

// ─── Pipeline Counters ────────────────────────────────────────────────────────

export const pipelineCyclesTotal = meter.createCounter("pipeline.cycles.total", {
  description: "Total pipeline cycles completed",
});

export const pipelineTasksCreated = meter.createCounter(
  "pipeline.tasks.created",
  { description: "Total tasks created" }
);

export const pipelineTasksResolved = meter.createCounter(
  "pipeline.tasks.resolved",
  { description: "Total tasks resolved" }
);

// ─── Agent Counters ───────────────────────────────────────────────────────────

export const agentTurnsTotal = meter.createCounter("agent.turns.total", {
  description: "Agent turns total (per agent label)",
});

export const agentTokensInput = meter.createCounter("agent.tokens.input", {
  description: "Input tokens consumed (per agent label)",
});

export const agentTokensOutput = meter.createCounter("agent.tokens.output", {
  description: "Output tokens consumed (per agent label)",
});

export const agentLatency = meter.createHistogram("agent.latency.seconds", {
  description: "Agent response latency in seconds",
  unit: "s",
});

// ─── Tool Counters ────────────────────────────────────────────────────────────

export const toolInvocationsTotal = meter.createCounter(
  "tool.invocations.total",
  { description: "Tool invocations total (per tool name)" }
);

// ─── Session Gauges ───────────────────────────────────────────────────────────

export const sessionContextUsage = meter.createGauge("session.context.usage", {
  description: "Context window utilization 0.0–1.0",
});

export const sessionCompactionsTotal = meter.createCounter(
  "session.compactions.total",
  { description: "Session compaction events" }
);

// ─── Fixer Counters ───────────────────────────────────────────────────────────

export const fixerBuildsPass = meter.createCounter("fixer.builds.pass", {
  description: "Build successes",
});

export const fixerBuildsFail = meter.createCounter("fixer.builds.fail", {
  description: "Build failures",
});

// ─── SSE & API Metrics ────────────────────────────────────────────────────

export const sseActiveConnections = meter.createUpDownCounter("sse.connections.active", {
  description: "Currently active SSE connections",
});

export const sseReconnections = meter.createCounter("sse.reconnections.total", {
  description: "Total SSE reconnections",
});

export const apiRouteLatency = meter.createHistogram("api.route.latency.ms", {
  description: "API route response latency in milliseconds",
  unit: "ms",
});

// ─── UX Gauges ────────────────────────────────────────────────────────────────

export const uxScoreNavigation = meter.createGauge("ux.score.navigation", {
  description: "UX score — navigation",
});

export const uxScoreClarity = meter.createGauge("ux.score.clarity", {
  description: "UX score — clarity",
});

export const uxScoreErrorHandling = meter.createGauge(
  "ux.score.error_handling",
  { description: "UX score — error handling" }
);

export const uxScoreAccessibility = meter.createGauge(
  "ux.score.accessibility",
  { description: "UX score — accessibility" }
);

export const uxScoreOverall = meter.createGauge("ux.score.overall", {
  description: "UX score — overall",
});

// ─── Snapshot for API ─────────────────────────────────────────────────────────

/**
 * In-memory snapshot of latest metric values for the /api/metrics endpoint.
 * OTel metric readers export asynchronously, so we maintain a simple mirror
 * that gets updated by the orchestrator/hooks.
 */

export interface MetricsSnapshot {
  cyclesCompleted: number;
  tasksCreated: number;
  tasksResolved: number;
  agentTurns: Record<string, number>;
  agentInputTokens: Record<string, number>;
  agentOutputTokens: Record<string, number>;
  agentCacheReadTokens: Record<string, number>;
  agentCacheWriteTokens: Record<string, number>;
  toolInvocations: Record<string, number>;
  contextUsage: number;
  contextTokenLimit: number;
  contextCurrentTokens: number;
  compactions: number;
  buildsPass: number;
  buildsFail: number;
  uxScores: Record<string, number>;
  modelMaxContextTokens: number;
  sseActiveConnections: number;
  sseReconnections: number;
  apiRouteLatencies: Record<string, number[]>;
  /** Cumulative premium requests from session.shutdown events */
  totalPremiumRequests: number;
  /** Cumulative code changes from session.shutdown events */
  totalCodeChanges: { linesAdded: number; linesRemoved: number; filesModified: number };
}

const snapshot: MetricsSnapshot = {
  cyclesCompleted: 0,
  tasksCreated: 0,
  tasksResolved: 0,
  agentTurns: {},
  agentInputTokens: {},
  agentOutputTokens: {},
  agentCacheReadTokens: {},
  agentCacheWriteTokens: {},
  toolInvocations: {},
  contextUsage: 0,
  contextTokenLimit: 0,
  contextCurrentTokens: 0,
  compactions: 0,
  buildsPass: 0,
  buildsFail: 0,
  uxScores: {},
  modelMaxContextTokens: 0,
  sseActiveConnections: 0,
  sseReconnections: 0,
  apiRouteLatencies: {},
  totalPremiumRequests: 0,
  totalCodeChanges: { linesAdded: 0, linesRemoved: 0, filesModified: 0 },
};

export function getMetricsSnapshot(): MetricsSnapshot {
  return { ...snapshot };
}

export function recordCycleComplete(): void {
  snapshot.cyclesCompleted++;
  pipelineCyclesTotal.add(1);
}

export function recordTaskCreated(): void {
  snapshot.tasksCreated++;
  pipelineTasksCreated.add(1);
}

export function recordTaskResolved(): void {
  snapshot.tasksResolved++;
  pipelineTasksResolved.add(1);
}

export function recordAgentTurn(agent: string): void {
  snapshot.agentTurns[agent] = (snapshot.agentTurns[agent] ?? 0) + 1;
  agentTurnsTotal.add(1, { agent });
}

export function recordAgentTokens(
  agent: string,
  input: number,
  output: number,
  cacheRead?: number,
  cacheWrite?: number,
): void {
  snapshot.agentInputTokens[agent] =
    (snapshot.agentInputTokens[agent] ?? 0) + input;
  snapshot.agentOutputTokens[agent] =
    (snapshot.agentOutputTokens[agent] ?? 0) + output;
  if (cacheRead) {
    snapshot.agentCacheReadTokens[agent] =
      (snapshot.agentCacheReadTokens[agent] ?? 0) + cacheRead;
  }
  if (cacheWrite) {
    snapshot.agentCacheWriteTokens[agent] =
      (snapshot.agentCacheWriteTokens[agent] ?? 0) + cacheWrite;
  }
  agentTokensInput.add(input, { agent });
  agentTokensOutput.add(output, { agent });
}

export function recordAgentLatency(agent: string, seconds: number): void {
  agentLatency.record(seconds, { agent });
}

export function recordToolInvocation(tool: string): void {
  snapshot.toolInvocations[tool] = (snapshot.toolInvocations[tool] ?? 0) + 1;
  toolInvocationsTotal.add(1, { tool });
}

export function recordContextUsage(usage: number): void {
  snapshot.contextUsage = usage;
  sessionContextUsage.record(usage);
}

/** Update context window state from SDK session.usage_info event. */
export function recordContextWindow(tokenLimit: number, currentTokens: number): void {
  snapshot.contextTokenLimit = tokenLimit;
  snapshot.contextCurrentTokens = currentTokens;
  const usage = tokenLimit > 0 ? currentTokens / tokenLimit : 0;
  snapshot.contextUsage = usage;
  sessionContextUsage.record(usage);
}

export function setModelMaxContextTokens(tokens: number): void {
  snapshot.modelMaxContextTokens = tokens;
}

export function recordCompaction(): void {
  snapshot.compactions++;
  sessionCompactionsTotal.add(1);
}

/** Record session shutdown metrics from SDK session.shutdown event. */
export function recordSessionShutdown(data: {
  premiumRequests?: number;
  codeChanges?: { linesAdded: number; linesRemoved: number; filesModified: number };
}): void {
  if (data.premiumRequests) {
    snapshot.totalPremiumRequests += data.premiumRequests;
  }
  if (data.codeChanges) {
    snapshot.totalCodeChanges.linesAdded += data.codeChanges.linesAdded;
    snapshot.totalCodeChanges.linesRemoved += data.codeChanges.linesRemoved;
    snapshot.totalCodeChanges.filesModified += data.codeChanges.filesModified;
  }
}

export function recordBuildPass(): void {
  snapshot.buildsPass++;
  fixerBuildsPass.add(1);
}

export function recordBuildFail(): void {
  snapshot.buildsFail++;
  fixerBuildsFail.add(1);
}

export function recordSSEConnect(): void {
  snapshot.sseActiveConnections++;
  sseActiveConnections.add(1);
}

export function recordSSEDisconnect(): void {
  snapshot.sseActiveConnections--;
  sseActiveConnections.add(-1);
}

export function recordSSEReconnection(): void {
  snapshot.sseReconnections++;
  sseReconnections.add(1);
}

export function recordApiLatency(route: string, ms: number): void {
  if (!snapshot.apiRouteLatencies[route]) snapshot.apiRouteLatencies[route] = [];
  const arr = snapshot.apiRouteLatencies[route];
  arr.push(ms);
  if (arr.length > 100) arr.shift();
  apiRouteLatency.record(ms, { route });
}

export function withApiTiming<T>(route: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  return fn().finally(() => {
    recordApiLatency(route, performance.now() - start);
  });
}

export function recordUxScore(category: string, score: number): void {
  snapshot.uxScores[category] = score;
}
