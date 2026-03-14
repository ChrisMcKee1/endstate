"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AnimateNumber } from "motion-plus/react";
import type { PipelineState, Task } from "@/lib/types";
import { TASK_STATUSES, SEVERITIES } from "@/lib/types";
import { AGENT_VISUALS } from "@/lib/agent-visuals";
import { showToast } from "@/hooks/useToast";

interface MetricsSnapshot {
  agentInputTokens?: Record<string, number>;
  agentOutputTokens?: Record<string, number>;
  agentTurns?: Record<string, number>;
  toolInvocations?: Record<string, number>;
  buildsPass?: number;
  buildsFail?: number;
  cyclesCompleted?: number;
  compactions?: number;
  contextUsage?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface MetricsBarProps {
  pipelineState: PipelineState;
  tasks: Task[];
}

export function MetricsBar({ pipelineState, tasks }: MetricsBarProps) {
  const [metrics, setMetrics] = useState<MetricsSnapshot>({});

  // Poll metrics — every 5s for responsive updates
  useEffect(() => {
    const controller = new AbortController();

    const fetchMetrics = () => {
      fetch("/api/metrics", { signal: controller.signal })
        .then((r) => r.json())
        .then((data: { metrics?: MetricsSnapshot }) => {
          if (data.metrics) setMetrics(data.metrics);
        })
        .catch(() => { showToast('Failed to load metrics'); });
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5_000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
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
    (metrics.buildsPass ?? 0) + (metrics.buildsFail ?? 0);
  const buildPassRate =
    buildTotal > 0
      ? Math.round(((metrics.buildsPass ?? 0) / buildTotal) * 100)
      : 0;

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const totalTokens = useMemo(() => {
    const inp = metrics.agentInputTokens ?? {};
    const out = metrics.agentOutputTokens ?? {};
    const allRoles = new Set([...Object.keys(inp), ...Object.keys(out)]);
    let sum = 0;
    for (const r of allRoles) sum += (inp[r] ?? 0) + (out[r] ?? 0);
    return sum;
  }, [metrics.agentInputTokens, metrics.agentOutputTokens]);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3 gap-4" role="region" aria-label="Pipeline metrics">
      {/* Cycle counter */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="glass-panel rounded-xl p-4 text-center"
        role="group"
        aria-label={`Cycles completed: ${pipelineState.currentCycle}`}
      >
        <p className="text-[10px] uppercase tracking-widest text-text-muted">
          Cycles Completed
        </p>
        <p className="mt-1 font-mono text-3xl font-bold text-accent tabular-nums" aria-live="polite">
          <AnimateNumber
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          >
            {pipelineState.currentCycle}
          </AnimateNumber>
        </p>
      </motion.div>

      {/* Task counts */}
      <div>
        <h3 className="mb-2 text-[10px] uppercase tracking-widest text-text-muted">
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

      {/* Build ratio — mini bar chart */}
      <div>
        <h3 className="mb-2 text-[10px] uppercase tracking-widest text-text-muted">
          Build Success
        </h3>
        <div className="glass-panel rounded-xl p-3">
          <div className="flex items-end gap-1 h-12 mb-2">
            <motion.div
              className="flex-1 rounded-t bg-status-live/80"
              initial={{ height: 0 }}
              animate={{ height: buildTotal > 0 ? `${((metrics.buildsPass ?? 0) / buildTotal) * 100}%` : "0%" }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            />
            <motion.div
              className="flex-1 rounded-t bg-severity-critical/80"
              initial={{ height: 0 }}
              animate={{ height: buildTotal > 0 ? `${((metrics.buildsFail ?? 0) / buildTotal) * 100}%` : "0%" }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            />
          </div>
          <div className="flex justify-between items-center">
            <div className="flex gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-status-live" />
                <span className="text-text-secondary tabular-nums">{metrics.buildsPass ?? 0}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-severity-critical" />
                <span className="text-text-secondary tabular-nums">{metrics.buildsFail ?? 0}</span>
              </span>
            </div>
            <span className="font-mono text-sm font-bold text-text-primary tabular-nums">
              {buildTotal > 0 ? `${buildPassRate}%` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Tool invocations */}
      <div>
        <h3 className="mb-2 text-[10px] uppercase tracking-widest text-text-muted">
          Tool Calls
        </h3>
        <span className="font-mono text-lg font-bold text-text-primary tabular-nums">
          {metrics.toolInvocations ? Object.values(metrics.toolInvocations).reduce((s, v) => s + v, 0) : "—"}
        </span>
      </div>

      {/* Tokens per agent — horizontal bars */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] uppercase tracking-widest text-text-muted">
            Token Usage
          </h3>
          <span className="font-mono text-[10px] text-accent tabular-nums">
            {totalTokens > 0 ? formatTokens(totalTokens) : "—"}
          </span>
        </div>
        <div className="space-y-2.5">
          {Object.entries(AGENT_VISUALS).map(([role, vis]) => {
            const input = metrics.agentInputTokens?.[role] ?? 0;
            const output = metrics.agentOutputTokens?.[role] ?? 0;
            const total = input + output;
            const pct = totalTokens > 0 ? (total / totalTokens) * 100 : 0;

            return (
              <div key={role}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${vis.bg}`} />
                    <span className="text-[11px] text-text-secondary">{vis.tag}</span>
                  </div>
                  <span className={`font-mono text-[10px] tabular-nums ${total > 0 ? vis.text : "text-text-muted/30"}`}>
                    {total > 0 ? formatTokens(total) : "—"}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-void/50">
                  <motion.div
                    className={`h-full rounded-full ${vis.bg} opacity-70`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                  />
                </div>
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="glass-panel rounded-xl p-2.5 text-center"
      role="group"
      aria-label={`${label}: ${value}`}
    >
      <p className={`font-mono text-lg font-bold tabular-nums ${color}`} aria-live="polite">
        <AnimateNumber
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        >
          {value}
        </AnimateNumber>
      </p>
      <p className="text-[10px] text-text-muted">{label}</p>
    </motion.div>
  );
}
