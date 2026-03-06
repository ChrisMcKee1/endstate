"use client";

import { useState, useMemo } from "react";
import type { Task, Severity, TaskStatus } from "@/lib/types";
import { SEVERITIES, TASK_STATUSES } from "@/lib/types";

// ─── Severity styling ────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<Severity, { color: string; bg: string }> = {
  [SEVERITIES.CRITICAL]: { color: "text-severity-critical", bg: "bg-severity-critical/15" },
  [SEVERITIES.HIGH]: { color: "text-severity-high", bg: "bg-severity-high/15" },
  [SEVERITIES.MEDIUM]: { color: "text-severity-medium", bg: "bg-severity-medium/15" },
  [SEVERITIES.LOW]: { color: "text-severity-low", bg: "bg-severity-low/15" },
};

const STATUS_ICONS: Record<TaskStatus, string> = {
  [TASK_STATUSES.OPEN]: "○",
  [TASK_STATUSES.IN_PROGRESS]: "◐",
  [TASK_STATUSES.RESOLVED]: "●",
  [TASK_STATUSES.DEFERRED]: "◌",
  [TASK_STATUSES.WONT_FIX]: "✕",
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

// ─── Component ───────────────────────────────────────────────────────────────

interface TaskListProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

export function TaskList({ tasks, onSelectTask }: TaskListProps) {
  const [sortBy, setSortBy] = useState<SortKey>("severity");
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>("ALL");

  const sortedTasks = useMemo(() => {
    const sevOrder: Record<Severity, number> = {
      [SEVERITIES.CRITICAL]: 0,
      [SEVERITIES.HIGH]: 1,
      [SEVERITIES.MEDIUM]: 2,
      [SEVERITIES.LOW]: 3,
    };

    let filtered = tasks;
    if (filterSeverity !== "ALL") {
      filtered = tasks.filter((t) => t.severity === filterSeverity);
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "severity":
          return sevOrder[a.severity] - sevOrder[b.severity];
        case "status": {
          const statusOrder: Record<TaskStatus, number> = {
            [TASK_STATUSES.IN_PROGRESS]: 0,
            [TASK_STATUSES.OPEN]: 1,
            [TASK_STATUSES.DEFERRED]: 2,
            [TASK_STATUSES.RESOLVED]: 3,
            [TASK_STATUSES.WONT_FIX]: 4,
          };
          return statusOrder[a.status] - statusOrder[b.status];
        }
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
          <span className="font-[family-name:var(--font-code)] text-sm font-bold text-text-primary">
            {counts.total}
          </span>
          <span className="text-[10px] text-text-muted">tasks</span>
        </div>
        <div className="flex gap-2">
          <span className="text-[10px] text-accent">{counts.open} open</span>
          <span className="text-[10px] text-status-live">
            {counts.resolved} fixed
          </span>
          {counts.critical > 0 && (
            <span className="text-[10px] text-severity-critical">
              {counts.critical} critical
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-1.5">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="rounded border border-border-subtle bg-void/50 px-2 py-0.5 text-[10px] text-text-secondary focus:outline-none"
        >
          <option value="severity">Severity</option>
          <option value="status">Status</option>
          <option value="cycle">Cycle</option>
        </select>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value as FilterSeverity)}
          className="rounded border border-border-subtle bg-void/50 px-2 py-0.5 text-[10px] text-text-secondary focus:outline-none"
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
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-text-muted">
            <span className="text-2xl">📋</span>
            <span className="text-xs">No tasks yet</span>
          </div>
        ) : (
          sortedTasks.map((task) => {
            const sev = SEVERITY_STYLES[task.severity];
            return (
              <button
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="group flex w-full items-start gap-2.5 border-b border-border-subtle/50 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.02]"
              >
                {/* Status icon */}
                <span
                  className={`mt-0.5 shrink-0 font-[family-name:var(--font-code)] text-sm ${STATUS_COLORS[task.status]}`}
                >
                  {STATUS_ICONS[task.status]}
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${sev.bg} ${sev.color}`}
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
                    <span className="text-[10px] text-text-muted/50">
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
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
