"use client";

import { useState, useEffect, useCallback } from "react";
import type { Task, TaskEvent } from "@/lib/types";
import { SEVERITIES, AGENT_ROLES } from "@/lib/types";
import { FileDiffPreview } from "@/components/FileDiffPreview";

// ─── Constants ───────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, string> = {
  [SEVERITIES.CRITICAL]: "bg-severity-critical/15 text-severity-critical border-severity-critical/30",
  [SEVERITIES.HIGH]: "bg-severity-high/15 text-severity-high border-severity-high/30",
  [SEVERITIES.MEDIUM]: "bg-severity-medium/15 text-severity-medium border-severity-medium/30",
  [SEVERITIES.LOW]: "bg-severity-low/15 text-severity-low border-severity-low/30",
};

const AGENT_COLORS: Record<string, string> = {
  [AGENT_ROLES.EXPLORER]: "border-agent-explorer bg-agent-explorer",
  [AGENT_ROLES.ANALYST]: "border-agent-analyst bg-agent-analyst",
  [AGENT_ROLES.FIXER]: "border-agent-fixer bg-agent-fixer",
  [AGENT_ROLES.UX_REVIEWER]: "border-agent-ux bg-agent-ux",
};

const AGENT_LABELS: Record<string, string> = {
  [AGENT_ROLES.EXPLORER]: "Explorer",
  [AGENT_ROLES.ANALYST]: "Analyst",
  [AGENT_ROLES.FIXER]: "Fixer",
  [AGENT_ROLES.UX_REVIEWER]: "UX Reviewer",
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

  // Close on Escape
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border-subtle bg-surface shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-subtle p-4">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-[family-name:var(--font-code)] text-xs text-text-muted">
                {task.id}
              </span>
              <span
                className={`rounded border px-2 py-0.5 text-[10px] font-bold ${SEVERITY_STYLES[task.severity]}`}
              >
                {task.severity}
              </span>
              <span className="rounded bg-overlay px-2 py-0.5 text-[10px] text-text-secondary">
                {task.status}
              </span>
              <span className="text-[10px] text-text-muted">
                Cycle {task.cycle}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-text-primary">
              {task.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="ml-4 rounded p-1 text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Files */}
          {task.files.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest text-text-muted">
                Affected Files
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {task.files.map((file) => {
                  const ext = getFileExt(file);
                  const icon = FILE_ICONS[ext] ?? "📄";
                  return (
                    <span
                      key={file}
                      className="flex items-center gap-1 rounded border border-border-subtle bg-elevated px-2 py-1 font-[family-name:var(--font-code)] text-[11px] text-text-secondary"
                    >
                      <span className="text-[10px]">{icon}</span>
                      {file.split("/").pop()}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1">
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
            <h3 className="mb-3 font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest text-text-muted">
              Agent Timeline
            </h3>
            <div className="relative border-l border-border-subtle pl-4">
              {task.timeline.map((event: TaskEvent, idx: number) => {
                const isExpanded = expandedEvents.has(idx);
                const agentColor =
                  AGENT_COLORS[event.agent] ?? "border-text-muted bg-text-muted";

                return (
                  <div key={idx} className="relative mb-4 last:mb-0">
                    {/* Timeline dot */}
                    <div
                      className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 ${agentColor}`}
                      style={{ opacity: 0.8 }}
                    />

                    {/* Event card */}
                    <button
                      onClick={() => toggleEvent(idx)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text-primary">
                          {AGENT_LABELS[event.agent] ?? event.agent}
                        </span>
                        <span className="rounded bg-overlay px-1.5 py-0.5 text-[10px] text-text-secondary">
                          {ACTION_LABELS[event.action] ?? event.action}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          C{event.cycle}
                        </span>
                        {event.buildResult && (
                          <span
                            className={`text-[10px] font-bold ${
                              event.buildResult === "pass"
                                ? "text-status-live"
                                : "text-severity-critical"
                            }`}
                          >
                            Build: {event.buildResult.toUpperCase()}
                          </span>
                        )}
                        <span className="ml-auto text-[9px] text-text-muted/50">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-text-secondary">
                        {event.detail}
                      </p>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="mt-2 space-y-2 animate-fade-in">
                        {event.expected && (
                          <div className="rounded border border-border-subtle bg-void/50 p-2">
                            <span className="text-[10px] font-semibold text-text-muted">
                              Expected:
                            </span>
                            <p className="mt-0.5 text-xs text-text-secondary">
                              {event.expected}
                            </p>
                          </div>
                        )}
                        {event.actual && (
                          <div className="rounded border border-severity-critical/20 bg-severity-critical/5 p-2">
                            <span className="text-[10px] font-semibold text-severity-critical/70">
                              Actual:
                            </span>
                            <p className="mt-0.5 text-xs text-text-secondary">
                              {event.actual}
                            </p>
                          </div>
                        )}
                        {event.reasoning && (
                          <div className="rounded border border-border-subtle bg-void/50 p-2">
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
                            <span className="font-[family-name:var(--font-code)] text-accent">
                              {event.otelTraceId.slice(0, 16)}…
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
