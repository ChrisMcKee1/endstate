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
  toolInvocations: Record<string, number>;
  contextUsage: number;
  compactions: number;
  buildsPass: number;
  buildsFail: number;
  uxScores: Record<string, number>;
}

const snapshot: MetricsSnapshot = {
  cyclesCompleted: 0,
  tasksCreated: 0,
  tasksResolved: 0,
  agentTurns: {},
  agentInputTokens: {},
  agentOutputTokens: {},
  toolInvocations: {},
  contextUsage: 0,
  compactions: 0,
  buildsPass: 0,
  buildsFail: 0,
  uxScores: {},
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
  output: number
): void {
  snapshot.agentInputTokens[agent] =
    (snapshot.agentInputTokens[agent] ?? 0) + input;
  snapshot.agentOutputTokens[agent] =
    (snapshot.agentOutputTokens[agent] ?? 0) + output;
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

export function recordCompaction(): void {
  snapshot.compactions++;
  sessionCompactionsTotal.add(1);
}

export function recordBuildPass(): void {
  snapshot.buildsPass++;
  fixerBuildsPass.add(1);
}

export function recordBuildFail(): void {
  snapshot.buildsFail++;
  fixerBuildsFail.add(1);
}

export function recordUxScore(category: string, score: number): void {
  snapshot.uxScores[category] = score;
}
