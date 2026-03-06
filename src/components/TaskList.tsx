"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Task, Severity, TaskStatus } from "@/lib/types";
import { SEVERITIES, TASK_STATUSES } from "@/lib/types";

// ─── Severity styling ────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<Severity, { color: string; bg: string; glow: string }> = {
  [SEVERITIES.CRITICAL]: { color: "text-severity-critical", bg: "bg-severity-critical/15", glow: "rgba(239,68,68,0.15)" },
  [SEVERITIES.HIGH]: { color: "text-severity-high", bg: "bg-severity-high/15", glow: "rgba(249,115,22,0.15)" },
  [SEVERITIES.MEDIUM]: { color: "text-severity-medium", bg: "bg-severity-medium/15", glow: "rgba(234,179,8,0.12)" },
  [SEVERITIES.LOW]: { color: "text-severity-low", bg: "bg-severity-low/15", glow: "rgba(59,130,246,0.12)" },
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  [TASK_STATUSES.OPEN]: "text-text-secondary",
  [TASK_STATUSES.IN_PROGRESS]: "text-accent",
  [TASK_STATUSES.RESOLVED]: "text-status-live",
  [TASK_STATUSES.DEFERRED]: "text-text-muted",
  [TASK_STATUSES.WONT_FIX]: "text-text-muted",
};

type SortKey = "severity" | "status" | "cycle";
type FilterSeverity = Severity | "ALL";

const SEVERITY_ORDER: Record<Severity, number> = {
  [SEVERITIES.CRITICAL]: 0,
  [SEVERITIES.HIGH]: 1,
  [SEVERITIES.MEDIUM]: 2,
  [SEVERITIES.LOW]: 3,
};

const STATUS_ORDER: Record<TaskStatus, number> = {
  [TASK_STATUSES.IN_PROGRESS]: 0,
  [TASK_STATUSES.OPEN]: 1,
  [TASK_STATUSES.DEFERRED]: 2,
  [TASK_STATUSES.RESOLVED]: 3,
  [TASK_STATUSES.WONT_FIX]: 4,
};

const SPRING = { type: "spring" as const, stiffness: 400, damping: 30 };
const STAGGER = { staggerChildren: 0.04 };

// ─── Status Icon Component ──────────────────────────────────────────────────

function StatusIcon({ status }: { status: TaskStatus }) {
  if (status === TASK_STATUSES.IN_PROGRESS) {
    return (
      <motion.svg
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="h-3.5 w-3.5 text-accent"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
      </motion.svg>
    );
  }

  if (status === TASK_STATUSES.RESOLVED) {
    return (
      <motion.svg
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 15 }}
        className="h-3.5 w-3.5 text-status-live"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </motion.svg>
    );
  }

  const iconMap: Record<string, string> = {
    [TASK_STATUSES.OPEN]: "○",
    [TASK_STATUSES.DEFERRED]: "◌",
    [TASK_STATUSES.WONT_FIX]: "✕",
  };

  return (
    <span className={`font-mono text-sm ${STATUS_COLORS[status]}`}>
      {iconMap[status] ?? "○"}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface TaskListProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

export function TaskList({ tasks, onSelectTask }: TaskListProps) {
  const [sortBy, setSortBy] = useState<SortKey>("severity");
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>("ALL");

  const sortedTasks = useMemo(() => {
    let filtered = tasks;
    if (filterSeverity !== "ALL") {
      filtered = tasks.filter((t) => t.severity === filterSeverity);
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "severity":
          return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        case "status":
          return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        case "cycle":
          return b.cycle - a.cycle;
        default:
          return 0;
      }
    });
  }, [tasks, sortBy, filterSeverity]);

  const counts = useMemo(() => {
    const open = tasks.filter(
      (t) => t.status === TASK_STATUSES.OPEN || t.status === TASK_STATUSES.IN_PROGRESS,
    ).length;
    const resolved = tasks.filter(
      (t) => t.status === TASK_STATUSES.RESOLVED,
    ).length;
    const critical = tasks.filter(
      (t) => t.severity === SEVERITIES.CRITICAL && t.status !== TASK_STATUSES.RESOLVED,
    ).length;
    return { open, resolved, critical, total: tasks.length };
  }, [tasks]);

  return (
    <div className="flex h-full flex-col">
      {/* Summary bar */}
      <div className="flex items-center gap-3 border-b border-border-subtle px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-bold text-text-primary">
            {counts.total}
          </span>
          <span className="text-[10px] text-text-muted">tasks</span>
        </div>
        <div className="flex gap-2">
          <span className="font-mono text-[10px] text-accent">{counts.open} open</span>
          <span className="font-mono text-[10px] text-status-live">
            {counts.resolved} fixed
          </span>
          {counts.critical > 0 && (
            <span className="font-mono text-[10px] text-severity-critical">
              {counts.critical} critical
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel flex items-center gap-2 rounded-none border-x-0 border-t-0 border-b border-border-subtle px-3 py-1.5">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="rounded-lg border border-border-subtle bg-void/50 px-2 py-1 text-[10px] text-text-secondary focus:border-accent/50 focus:outline-none"
        >
          <option value="severity">Severity</option>
          <option value="status">Status</option>
          <option value="cycle">Cycle</option>
        </select>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value as FilterSeverity)}
          className="rounded-lg border border-border-subtle bg-void/50 px-2 py-1 text-[10px] text-text-secondary focus:border-accent/50 focus:outline-none"
        >
          <option value="ALL">All</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {sortedTasks.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 p-10"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/5 to-agent-violet/5">
                <span className="text-3xl opacity-50">📋</span>
              </div>
              <span className="text-xs text-text-muted">No tasks yet</span>
              <span className="text-[10px] text-text-muted/50">
                Tasks will appear as agents discover issues
              </span>
            </motion.div>
          ) : (
            <motion.div variants={{ show: STAGGER }} initial="hidden" animate="show">
              {sortedTasks.map((task) => {
                const sev = SEVERITY_STYLES[task.severity];
                return (
                  <motion.button
                    key={task.id}
                    variants={{
                      hidden: { opacity: 0, x: -12 },
                      show: { opacity: 1, x: 0 },
                    }}
                    transition={SPRING}
                    whileHover={{
                      backgroundColor: "rgba(255,255,255,0.02)",
                      boxShadow: `inset 3px 0 0 ${sev.glow}`,
                    }}
                    onClick={() => onSelectTask(task)}
                    className="group flex w-full items-start gap-2.5 border-b border-border-subtle/50 px-3 py-2.5 text-left"
                  >
                    {/* Status icon */}
                    <span className="mt-0.5 shrink-0">
                      <StatusIcon status={task.status} />
                    </span>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${sev.bg} ${sev.color}`}
                        >
                          {task.severity}
                        </span>
                        <span className="truncate text-xs text-text-primary group-hover:text-accent">
                          {task.title}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-[10px] text-text-muted">
                          {task.component}
                        </span>
                        <span className="font-mono text-[10px] text-text-muted/50">
                          C{task.cycle}
                        </span>
                        {task.files.length > 0 && (
                          <span className="text-[10px] text-text-muted/50">
                            {task.files.length} file{task.files.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg
                      className="mt-1 h-3 w-3 shrink-0 text-text-muted/30 transition-colors group-hover:text-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}