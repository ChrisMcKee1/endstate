"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Task, Severity, TaskStatus, Domain } from "@/lib/types";
import { SEVERITIES, TASK_STATUSES, DOMAINS } from "@/lib/types";

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
  [TASK_STATUSES.BLOCKED]: "text-severity-high",
  [TASK_STATUSES.RESOLVED]: "text-status-live",
  [TASK_STATUSES.DEFERRED]: "text-text-muted",
  [TASK_STATUSES.WONT_FIX]: "text-text-muted",
};

type SortKey = "severity" | "status" | "cycle";
type FilterSeverity = Severity | "ALL";
type FilterStatus = "ALL" | "ACTIVE" | "BLOCKED" | "DONE" | "SKIPPED";

const SEVERITY_ORDER: Record<Severity, number> = {
  [SEVERITIES.CRITICAL]: 0,
  [SEVERITIES.HIGH]: 1,
  [SEVERITIES.MEDIUM]: 2,
  [SEVERITIES.LOW]: 3,
};

const STATUS_ORDER: Record<TaskStatus, number> = {
  [TASK_STATUSES.BLOCKED]: 0,
  [TASK_STATUSES.IN_PROGRESS]: 1,
  [TASK_STATUSES.OPEN]: 2,
  [TASK_STATUSES.DEFERRED]: 3,
  [TASK_STATUSES.RESOLVED]: 4,
  [TASK_STATUSES.WONT_FIX]: 5,
};

const DONE_STATUSES = new Set<TaskStatus>([TASK_STATUSES.RESOLVED, TASK_STATUSES.WONT_FIX]);
const SKIPPED_STATUSES = new Set<TaskStatus>([TASK_STATUSES.DEFERRED, TASK_STATUSES.WONT_FIX]);

const SPRING = { type: "spring" as const, stiffness: 400, damping: 30 };
const STAGGER = { staggerChildren: 0.04 };

const ALL_DOMAINS = Object.values(DOMAINS) as Domain[];

const DOMAIN_STYLES: Record<Domain, { label: string; color: string; bg: string }> = {
  [DOMAINS.UI]: { label: "UI", color: "text-agent-analyst-ui", bg: "bg-agent-analyst-ui/15" },
  [DOMAINS.BACKEND]: { label: "BE", color: "text-agent-analyst-backend", bg: "bg-agent-analyst-backend/15" },
  [DOMAINS.DATABASE]: { label: "DB", color: "text-agent-analyst-database", bg: "bg-agent-analyst-database/15" },
  [DOMAINS.DOCS]: { label: "Docs", color: "text-agent-analyst-docs", bg: "bg-agent-analyst-docs/15" },
};

const TASK_PREFS_KEY = "endstate-task-prefs";

function loadTaskPrefs(): { sortBy: SortKey; filterSeverity: FilterSeverity; filterStatus: FilterStatus; filterDomains: Domain[] } | null {
  try {
    const raw = localStorage.getItem(TASK_PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveTaskPrefs(sortBy: SortKey, filterSeverity: FilterSeverity, filterStatus: FilterStatus, filterDomains: Domain[]) {
  try {
    localStorage.setItem(TASK_PREFS_KEY, JSON.stringify({ sortBy, filterSeverity, filterStatus, filterDomains }));
  } catch { /* SSR or storage full */ }
}

// ─── Status Icon Component ──────────────────────────────────────────────────

function StatusIcon({ status, isRunning = false }: { status: TaskStatus; isRunning?: boolean }) {
  if (status === TASK_STATUSES.IN_PROGRESS) {
    return (
      <motion.svg
        animate={isRunning ? { rotate: 360 } : { rotate: 0 }}
        transition={isRunning ? { duration: 2, repeat: Infinity, ease: "linear" } : { duration: 0 }}
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

  if (status === TASK_STATUSES.BLOCKED) {
    return (
      <svg className="h-3.5 w-3.5 text-severity-high" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
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

  if (status === TASK_STATUSES.DEFERRED) {
    return (
      <svg className="h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  if (status === TASK_STATUSES.WONT_FIX) {
    return (
      <svg className="h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    );
  }

  // OPEN — empty circle
  return (
    <svg className="h-3.5 w-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface TaskListProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onRefreshTasks?: () => void;
  isRunning?: boolean;
}

export function TaskList({ tasks, onSelectTask, onRefreshTasks, isRunning = false }: TaskListProps) {
  const [sortBy, setSortBy] = useState<SortKey>(() => loadTaskPrefs()?.sortBy ?? "severity");
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>(() => loadTaskPrefs()?.filterSeverity ?? "ALL");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(() => loadTaskPrefs()?.filterStatus ?? "ALL");
  const [filterDomains, setFilterDomains] = useState<Set<Domain>>(() => {
    const saved = loadTaskPrefs()?.filterDomains;
    return saved?.length ? new Set(saved) : new Set<Domain>();
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterCycles, setFilterCycles] = useState<Set<number>>(new Set());

  useEffect(() => {
    saveTaskPrefs(sortBy, filterSeverity, filterStatus, [...filterDomains]);
  }, [sortBy, filterSeverity, filterStatus, filterDomains]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addSeverity, setAddSeverity] = useState<Severity>(SEVERITIES.MEDIUM);
  const [addComponent, setAddComponent] = useState("");
  const [addDetail, setAddDetail] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const sortedTasks = useMemo(() => {
    let filtered = tasks;
    if (filterSeverity !== "ALL") {
      filtered = filtered.filter((t) => t.severity === filterSeverity);
    }
    if (filterStatus === "ACTIVE") {
      filtered = filtered.filter((t) => t.status === TASK_STATUSES.OPEN || t.status === TASK_STATUSES.IN_PROGRESS);
    } else if (filterStatus === "BLOCKED") {
      filtered = filtered.filter((t) => t.status === TASK_STATUSES.BLOCKED);
    } else if (filterStatus === "DONE") {
      filtered = filtered.filter((t) => t.status === TASK_STATUSES.RESOLVED);
    } else if (filterStatus === "SKIPPED") {
      filtered = filtered.filter((t) => SKIPPED_STATUSES.has(t.status));
    }
    // Domain filter: task must match ALL selected domains
    if (filterDomains.size > 0) {
      filtered = filtered.filter((t) => {
        const taskDomains = t.domains ?? [];
        for (const d of filterDomains) {
          if (!taskDomains.includes(d)) return false;
        }
        return true;
      });
    }
    // Cycle filter: task must be from one of the selected cycles
    if (filterCycles.size > 0) {
      filtered = filtered.filter((t) => filterCycles.has(t.cycle));
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
  }, [tasks, sortBy, filterSeverity, filterStatus, filterDomains, filterCycles]);

  // Derive unique cycles from all tasks for the filter chips
  const availableCycles = useMemo(() => {
    const cycles = new Set(tasks.map((t) => t.cycle));
    return [...cycles].sort((a, b) => a - b);
  }, [tasks]);

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

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleDomain = useCallback((domain: Domain) => {
    setFilterDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain); else next.add(domain);
      return next;
    });
  }, []);

  const toggleCycle = useCallback((cycle: number) => {
    setFilterCycles((prev) => {
      const next = new Set(prev);
      if (next.has(cycle)) next.delete(cycle); else next.add(cycle);
      return next;
    });
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        onRefreshTasks?.();
      }
    } catch { /* silent */ }
    finally { setDeleteLoading(false); }
  }, [selectedIds, onRefreshTasks]);

  const handleAddTask = useCallback(async () => {
    if (!addTitle.trim() || !addComponent.trim() || !addDetail.trim()) return;
    setAddLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: addTitle.trim(),
          severity: addSeverity,
          component: addComponent.trim(),
          detail: addDetail.trim(),
        }),
      });
      if (res.ok) {
        setAddTitle(""); setAddComponent(""); setAddDetail("");
        setShowAddForm(false);
        onRefreshTasks?.();
      }
    } catch { /* silent */ }
    finally { setAddLoading(false); }
  }, [addTitle, addSeverity, addComponent, addDetail, onRefreshTasks]);

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
        <div className="ml-auto flex items-center gap-1">
          {/* Add button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-md p-1 text-accent transition-colors hover:bg-accent/10"
            title="Add task"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </motion.button>
          {/* Delete selected */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDeleteSelected}
                disabled={deleteLoading}
                className="rounded-md p-1 text-severity-critical transition-colors hover:bg-severity-critical/10 disabled:opacity-40"
                title={`Delete ${selectedIds.size} selected`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-1.5" style={{ background: "rgba(20, 21, 31, 0.4)" }}>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="rounded-lg border border-border-subtle bg-overlay px-2 py-1 text-[10px] text-text-primary focus:border-accent/50 focus:outline-none [&>option]:bg-overlay [&>option]:text-text-primary"
        >
          <option value="severity">Severity</option>
          <option value="status">Status</option>
          <option value="cycle">Cycle</option>
        </select>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value as FilterSeverity)}
          className="rounded-lg border border-border-subtle bg-overlay px-2 py-1 text-[10px] text-text-primary focus:border-accent/50 focus:outline-none [&>option]:bg-overlay [&>option]:text-text-primary"
        >
          <option value="ALL">All</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="rounded-lg border border-border-subtle bg-overlay px-2 py-1 text-[10px] text-text-primary focus:border-accent/50 focus:outline-none [&>option]:bg-overlay [&>option]:text-text-primary"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="BLOCKED">Blocked</option>
          <option value="DONE">Done</option>
          <option value="SKIPPED">Skipped</option>
        </select>
      </div>

      {/* Domain filter chips */}
      <div className="flex items-center gap-1.5 border-b border-border-subtle px-3 py-1.5" style={{ background: "rgba(20, 21, 31, 0.3)" }}>
        <span className="text-[9px] uppercase tracking-widest text-text-muted/60 shrink-0">Domain</span>
        {ALL_DOMAINS.map((domain) => {
          const style = DOMAIN_STYLES[domain];
          const isActive = filterDomains.has(domain);
          return (
            <button
              key={domain}
              onClick={() => toggleDomain(domain)}
              className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider transition-all ${
                isActive
                  ? `${style.bg} ${style.color} ring-1 ring-current/20`
                  : "bg-white/[0.03] text-text-muted/50 hover:bg-white/[0.06] hover:text-text-muted"
              }`}
            >
              {style.label}
            </button>
          );
        })}
        {filterDomains.size > 0 && (
          <button
            onClick={() => setFilterDomains(new Set())}
            className="ml-auto text-[9px] text-text-muted/50 hover:text-text-secondary"
          >
            Clear
          </button>
        )}
      </div>

      {/* Cycle filter chips */}
      {availableCycles.length > 1 && (
        <div className="flex items-center gap-1.5 border-b border-border-subtle px-3 py-1.5" style={{ background: "rgba(20, 21, 31, 0.25)" }}>
          <span className="text-[9px] uppercase tracking-widest text-text-muted/60 shrink-0">Cycle</span>
          {availableCycles.map((cycle) => {
            const isActive = filterCycles.has(cycle);
            const count = tasks.filter((t) => t.cycle === cycle).length;
            return (
              <button
                key={cycle}
                onClick={() => toggleCycle(cycle)}
                className={`rounded-full px-2 py-0.5 text-[9px] font-semibold tabular-nums transition-all ${
                  isActive
                    ? "bg-accent/15 text-accent ring-1 ring-accent/20"
                    : "bg-white/[0.03] text-text-muted/50 hover:bg-white/[0.06] hover:text-text-muted"
                }`}
              >
                C{cycle}
                <span className="ml-0.5 text-[8px] opacity-60">{count}</span>
              </button>
            );
          })}
          {filterCycles.size > 0 && (
            <button
              onClick={() => setFilterCycles(new Set())}
              className="ml-auto text-[9px] text-text-muted/50 hover:text-text-secondary"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Add task form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING}
            className="overflow-hidden border-b border-border-subtle"
          >
            <div className="space-y-2 p-3" style={{ background: "rgba(20, 21, 31, 0.5)" }}>
              <input
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder="Task title…"
                className="w-full rounded-lg border border-border-active bg-void/60 px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/40 focus:border-accent/40 focus:outline-none"
              />
              <div className="flex gap-2">
                <select
                  value={addSeverity}
                  onChange={(e) => setAddSeverity(e.target.value as Severity)}
                  className="rounded-lg border border-border-subtle bg-void/50 px-2 py-1 text-[10px] text-text-secondary focus:border-accent/50 focus:outline-none"
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
                <input
                  value={addComponent}
                  onChange={(e) => setAddComponent(e.target.value)}
                  placeholder="Component…"
                  className="flex-1 rounded-lg border border-border-active bg-void/60 px-3 py-1 text-[10px] text-text-primary placeholder:text-text-muted/40 focus:border-accent/40 focus:outline-none"
                />
              </div>
              <textarea
                value={addDetail}
                onChange={(e) => setAddDetail(e.target.value)}
                placeholder="Description…"
                rows={2}
                className="w-full rounded-lg border border-border-active bg-void/60 px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/40 focus:border-accent/40 focus:outline-none resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg px-3 py-1 text-[10px] text-text-muted hover:text-text-secondary"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleAddTask}
                  disabled={addLoading || !addTitle.trim()}
                  className="rounded-lg bg-accent/15 px-3 py-1 text-[10px] font-medium text-accent hover:bg-accent/25 disabled:opacity-30"
                >
                  {addLoading ? "Adding…" : "Add Task"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                const isSelected = selectedIds.has(task.id);
                return (
                  <motion.div
                    key={task.id}
                    variants={{
                      hidden: { opacity: 0, x: -12 },
                      show: { opacity: 1, x: 0 },
                    }}
                    transition={SPRING}
                    className={`group flex w-full items-start gap-2 border-b border-border-subtle/50 px-3 py-2.5 ${
                      isSelected ? "bg-accent/5" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(task.id)}
                      className="mt-1 shrink-0"
                    >
                      <span className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "border-accent bg-accent/20 text-accent"
                          : "border-border-active text-transparent hover:border-text-muted"
                      }`}>
                        {isSelected && (
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </span>
                    </button>

                    {/* Status icon */}
                    <span className="mt-0.5 shrink-0">
                      <StatusIcon status={task.status} isRunning={isRunning} />
                    </span>

                    {/* Content — clickable to view detail */}
                    <button
                      onClick={() => onSelectTask(task)}
                      className="min-w-0 flex-1 text-left"
                    >
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
                        {(task.domains ?? []).length > 0 && (
                          <span className="flex items-center gap-1">
                            {(task.domains ?? []).map((d) => {
                              const ds = DOMAIN_STYLES[d];
                              return (
                                <span
                                  key={d}
                                  className={`rounded-full px-1.5 py-px text-[8px] font-bold uppercase ${ds.bg} ${ds.color}`}
                                >
                                  {ds.label}
                                </span>
                              );
                            })}
                          </span>
                        )}
                        {task.files.length > 0 && (
                          <span className="text-[10px] text-text-muted/50">
                            {task.files.length} file{task.files.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Quick delete */}
                    <motion.button
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={async () => {
                        await fetch("/api/tasks", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ids: [task.id] }),
                        });
                        onRefreshTasks?.();
                      }}
                      className="mt-0.5 shrink-0 rounded p-1 text-text-muted/30 opacity-0 transition-all group-hover:opacity-100 hover:bg-severity-critical/10 hover:text-severity-critical"
                      title="Delete task"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </motion.button>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}