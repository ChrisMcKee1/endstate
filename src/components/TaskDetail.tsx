"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Task, TaskEvent } from "@/lib/types";
import { SEVERITIES } from "@/lib/types";
import { FileDiffPreview } from "@/components/FileDiffPreview";
import { getAgentVisual } from "@/lib/agent-visuals";

// ─── Constants ───────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, string> = {
  [SEVERITIES.CRITICAL]: "bg-severity-critical/15 text-severity-critical border-severity-critical/30",
  [SEVERITIES.HIGH]: "bg-severity-high/15 text-severity-high border-severity-high/30",
  [SEVERITIES.MEDIUM]: "bg-severity-medium/15 text-severity-medium border-severity-medium/30",
  [SEVERITIES.LOW]: "bg-severity-low/15 text-severity-low border-severity-low/30",
};

const ACTION_LABELS: Record<string, string> = {
  discovered: "Discovered",
  diagnosed: "Diagnosed",
  fixed: "Fixed",
  verified: "Verified",
  flagged: "Flagged",
  deferred: "Deferred",
  regression: "Regression",
};

const FILE_ICONS: Record<string, string> = {
  ts: "🟦",
  tsx: "⚛️",
  js: "🟨",
  jsx: "⚛️",
  css: "🎨",
  html: "🌐",
  json: "📋",
  md: "📝",
  py: "🐍",
  rs: "🦀",
  go: "🐹",
  cs: "🟣",
};

const SPRING = { type: "spring" as const, stiffness: 400, damping: 25 };
const STAGGER = { staggerChildren: 0.06 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFileExt(filePath: string): string {
  const parts = filePath.split(".");
  return parts[parts.length - 1];
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return ts;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
}

export function TaskDetail({ task, onClose }: TaskDetailProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  const [showDiff, setShowDiff] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const toggleEvent = useCallback((idx: number) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="glass-panel relative mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl"
        >
          {/* Close button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={SPRING}
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>

          {/* Header */}
          <div className="border-b border-border-subtle p-5 pr-10">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-xs text-text-muted">
                {task.id}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${SEVERITY_STYLES[task.severity]}`}
              >
                {task.severity}
              </span>
              <span className="rounded-full bg-overlay px-2 py-0.5 text-[10px] text-text-secondary">
                {task.status}
              </span>
              <span className="font-mono text-[10px] text-text-muted">
                Cycle {task.cycle}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-text-primary">
              {task.title}
            </h2>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Files */}
            {task.files.length > 0 && (
              <div className="mb-5">
                <h3 className="mb-2 text-[10px] uppercase tracking-widest text-text-muted">
                  Affected Files
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {task.files.map((file) => {
                    const ext = getFileExt(file);
                    const icon = FILE_ICONS[ext] ?? "📄";
                    return (
                      <motion.span
                        key={file}
                        whileHover={{
                          scale: 1.03,
                          boxShadow: "0 0 10px rgba(0,229,255,0.1)",
                        }}
                        className="glass-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[11px] text-text-secondary"
                      >
                        <span className="text-[10px]">{icon}</span>
                        {file.split("/").pop()}
                      </motion.span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tags */}
            {task.tags.length > 0 && (
              <div className="mb-5 flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Timeline */}
            <div className="mb-4">
              <h3 className="mb-3 text-[10px] uppercase tracking-widest text-text-muted">
                Agent Timeline
              </h3>
              <motion.div
                variants={{ show: STAGGER }}
                initial="hidden"
                animate="show"
                className="relative border-l border-border-subtle pl-5"
              >
                {task.timeline.map((event: TaskEvent, idx: number) => {
                  const isExpanded = expandedEvents.has(idx);
                  const vis = getAgentVisual(event.agent);
                  const agentColor = `${vis.border} ${vis.bg}`;
                  const dotGlow = vis.glow;

                  return (
                    <motion.div
                      key={idx}
                      variants={{
                        hidden: { opacity: 0, x: -8 },
                        show: { opacity: 1, x: 0 },
                      }}
                      transition={SPRING}
                      className="relative mb-5 last:mb-0"
                    >
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 ${agentColor} ${dotGlow}`}
                      />

                      {/* Event card */}
                      <button
                        onClick={() => toggleEvent(idx)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-text-primary">
                            {vis.label}
                          </span>
                          <span className="rounded-full bg-overlay px-1.5 py-0.5 text-[10px] text-text-secondary">
                            {ACTION_LABELS[event.action] ?? event.action}
                          </span>
                          <span className="font-mono text-[10px] text-text-muted">
                            C{event.cycle}
                          </span>
                          {event.buildResult && (
                            <span
                              className={`font-mono text-[10px] font-bold ${
                                event.buildResult === "pass"
                                  ? "text-status-live"
                                  : "text-severity-critical"
                              }`}
                            >
                              Build: {event.buildResult.toUpperCase()}
                            </span>
                          )}
                          <span className="ml-auto font-mono text-[9px] text-text-muted/50">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-text-secondary">
                          {event.detail}
                        </p>
                      </button>

                      {/* Expanded detail */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 space-y-2">
                              {event.expected && (
                                <div className="glass-panel rounded-lg p-2.5">
                                  <span className="text-[10px] font-semibold text-text-muted">
                                    Expected:
                                  </span>
                                  <p className="mt-0.5 text-xs text-text-secondary">
                                    {event.expected}
                                  </p>
                                </div>
                              )}
                              {event.actual && (
                                <div className="rounded-lg border border-severity-critical/20 bg-severity-critical/5 p-2.5">
                                  <span className="text-[10px] font-semibold text-severity-critical/70">
                                    Actual:
                                  </span>
                                  <p className="mt-0.5 text-xs text-text-secondary">
                                    {event.actual}
                                  </p>
                                </div>
                              )}
                              {event.reasoning && (
                                <div className="glass-panel rounded-lg p-2.5">
                                  <span className="text-[10px] font-semibold text-text-muted">
                                    Reasoning:
                                  </span>
                                  <p className="mt-0.5 text-xs italic text-text-secondary">
                                    {event.reasoning}
                                  </p>
                                </div>
                              )}
                              {event.diff && (
                                <div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowDiff(showDiff === event.diff ? null : (event.diff ?? null));
                                    }}
                                    className="mb-1 text-[10px] font-medium text-accent hover:underline"
                                  >
                                    {showDiff === event.diff
                                      ? "Hide Diff"
                                      : "View Diff"}
                                  </button>
                                  {showDiff === event.diff && (
                                    <FileDiffPreview diff={event.diff} />
                                  )}
                                </div>
                              )}
                              {event.otelTraceId && (
                                <div className="flex items-center gap-1 text-[10px] text-text-muted">
                                  <span>Trace:</span>
                                  <span className="font-mono text-accent">
                                    {event.otelTraceId.slice(0, 16)}…
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}