"use client";

import { useMemo, useState, useEffect } from "react";
import type { PipelineState, Task } from "@/lib/types";
import { AGENT_ROLES, TASK_STATUSES, SEVERITIES } from "@/lib/types";

// ─── Agent color map ─────────────────────────────────────────────────────────

const AGENT_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  [AGENT_ROLES.EXPLORER]: { label: "Explorer", color: "text-agent-explorer", bg: "bg-agent-explorer" },
  [AGENT_ROLES.ANALYST]: { label: "Analyst", color: "text-agent-analyst", bg: "bg-agent-analyst" },
  [AGENT_ROLES.FIXER]: { label: "Fixer", color: "text-agent-fixer", bg: "bg-agent-fixer" },
  [AGENT_ROLES.UX_REVIEWER]: { label: "UX", color: "text-agent-ux", bg: "bg-agent-ux" },
};

interface MetricsSnapshot {
  tokensPerAgent?: Record<string, { input: number; output: number }>;
  avgLatencyMs?: number;
  buildsPassed?: number;
  buildsFailed?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface MetricsBarProps {
  pipelineState: PipelineState;
  tasks: Task[];
}

export function MetricsBar({ pipelineState, tasks }: MetricsBarProps) {
  const [metrics, setMetrics] = useState<MetricsSnapshot>({});

  // Poll metrics
  useEffect(() => {
    const fetchMetrics = () => {
      fetch("/api/metrics")
        .then((r) => r.json())
        .then((data: { metrics?: MetricsSnapshot }) => {
          if (data.metrics) setMetrics(data.metrics);
        })
        .catch(() => {});
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10_000);
    return () => clearInterval(interval);
  }, []);

  const taskCounts = useMemo(() => {
    const open = tasks.filter(
      (t) =>
        t.status === TASK_STATUSES.OPEN ||
        t.status === TASK_STATUSES.IN_PROGRESS,
    ).length;
    const resolved = tasks.filter(
      (t) => t.status === TASK_STATUSES.RESOLVED,
    ).length;
    const critical = tasks.filter(
      (t) =>
        t.severity === SEVERITIES.CRITICAL &&
        t.status !== TASK_STATUSES.RESOLVED,
    ).length;
    return { total: tasks.length, open, resolved, critical };
  }, [tasks]);

  const buildTotal =
    (metrics.buildsPassed ?? 0) + (metrics.buildsFailed ?? 0);
  const buildPassRate =
    buildTotal > 0
      ? Math.round(((metrics.buildsPassed ?? 0) / buildTotal) * 100)
      : 0;

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3">
      {/* Cycle counter */}
      <div className="mb-4 rounded-lg border border-border-subtle bg-void/30 p-3 text-center">
        <p className="font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest text-text-muted">
          Cycles Completed
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-accent">
          {pipelineState.currentCycle}
        </p>
      </div>

      {/* Task counts */}
      <div className="mb-4">
        <h3 className="mb-2 font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest text-text-muted">
          Tasks
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Total" value={taskCounts.total} color="text-text-primary" />
          <MetricCard label="Open" value={taskCounts.open} color="text-accent" />
          <MetricCard label="Resolved" value={taskCounts.resolved} color="text-status-live" />
          <MetricCard
            label="Critical"
            value={taskCounts.critical}
            color={taskCounts.critical > 0 ? "text-severity-critical" : "text-text-muted"}
          />
        </div>
      </div>

      {/* Build ratio */}
      <div className="mb-4">
        <h3 className="mb-2 font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest text-text-muted">
          Build Success
        </h3>
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-void/50">
            <div
              className="h-full rounded-full bg-status-live transition-all duration-500"
              style={{ width: `${buildPassRate}%` }}
            />
          </div>
          <span className="font-[family-name:var(--font-code)] text-xs font-bold text-text-primary">
            {buildTotal > 0 ? `${buildPassRate}%` : "—"}
          </span>
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-text-muted">
          <span className="text-status-live">
            {metrics.buildsPassed ?? 0} passed
          </span>
          <span className="text-severity-critical">
            {metrics.buildsFailed ?? 0} failed
          </span>
        </div>
      </div>

      {/* Avg latency */}
      <div className="mb-4">
        <h3 className="mb-2 font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest text-text-muted">
          Avg Latency
        </h3>
        <span className="font-[family-name:var(--font-code)] text-lg font-bold text-text-primary">
          {metrics.avgLatencyMs ? `${(metrics.avgLatencyMs / 1000).toFixed(1)}s` : "—"}
        </span>
      </div>

      {/* Tokens per agent */}
      <div>
        <h3 className="mb-2 font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest text-text-muted">
          Token Usage
        </h3>
        <div className="space-y-2">
          {Object.entries(AGENT_STYLES).map(([role, style]) => {
            const agentTokens = metrics.tokensPerAgent?.[role];
            const total = agentTokens
              ? agentTokens.input + agentTokens.output
              : 0;

            return (
              <div
                key={role}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${style.bg}`} />
                  <span className="text-[11px] text-text-secondary">
                    {style.label}
                  </span>
                </div>
                <span
                  className={`font-[family-name:var(--font-code)] text-xs ${
                    total > 0 ? style.color : "text-text-muted/30"
                  }`}
                >
                  {total > 0 ? formatTokens(total) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Helper component ────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-void/30 p-2 text-center">
      <p className={`font-[family-name:var(--font-code)] text-lg font-bold ${color}`}>
        {value}
      </p>
      <p className="text-[10px] text-text-muted">{label}</p>
    </div>
  );
}
