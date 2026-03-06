"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { AgentRole } from "@/lib/types";
import { AGENT_ROLES } from "@/lib/types";
import type { StreamEntry } from "@/components/Dashboard";

// ─── Agent color map ─────────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  [AGENT_ROLES.EXPLORER]: {
    text: "text-agent-explorer",
    bg: "bg-agent-explorer/10",
    border: "border-agent-explorer/20",
  },
  [AGENT_ROLES.ANALYST]: {
    text: "text-agent-analyst",
    bg: "bg-agent-analyst/10",
    border: "border-agent-analyst/20",
  },
  [AGENT_ROLES.FIXER]: {
    text: "text-agent-fixer",
    bg: "bg-agent-fixer/10",
    border: "border-agent-fixer/20",
  },
  [AGENT_ROLES.UX_REVIEWER]: {
    text: "text-agent-ux",
    bg: "bg-agent-ux/10",
    border: "border-agent-ux/20",
  },
};

const AGENT_LABELS: Record<string, string> = {
  [AGENT_ROLES.EXPLORER]: "EXPLORER",
  [AGENT_ROLES.ANALYST]: "ANALYST",
  [AGENT_ROLES.FIXER]: "FIXER",
  [AGENT_ROLES.UX_REVIEWER]: "UX",
};

const TYPE_ICONS: Record<StreamEntry["type"], string> = {
  message: "💬",
  "tool-start": "⚙️",
  "tool-complete": "✅",
  reasoning: "🧠",
  error: "❌",
  system: "📡",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface AgentStreamProps {
  entries: StreamEntry[];
  activeAgent: AgentRole | null;
}

export function AgentStream({ entries, activeAgent }: AgentStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  // Detect user scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setAutoScroll(isAtBottom);
  }, []);

  const toggleTool = useCallback((id: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Group consecutive message entries from the same agent into blocks
  const renderEntries = () => {
    if (entries.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-text-muted">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent/50" />
            <span className="font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest">
              Awaiting agent activity
            </span>
          </div>
          <p className="max-w-xs text-center text-xs text-text-muted/60">
            Start the pipeline or connect to an active session
          </p>
        </div>
      );
    }

    return entries.map((entry) => {
      const colors = entry.agent
        ? AGENT_COLORS[entry.agent]
        : { text: "text-text-muted", bg: "bg-overlay", border: "border-border-subtle" };
      const label = entry.agent ? AGENT_LABELS[entry.agent] : "SYS";
      const isToolEntry =
        entry.type === "tool-start" || entry.type === "tool-complete";
      const isExpanded = expandedTools.has(entry.id);
      const isError = entry.type === "error";

      return (
        <div
          key={entry.id}
          className={`group flex gap-2 px-4 py-1 transition-colors hover:bg-white/[0.02] ${
            isError ? "bg-severity-critical/5" : ""
          }`}
        >
          {/* Timestamp */}
          <span className="shrink-0 pt-0.5 font-[family-name:var(--font-code)] text-[10px] text-text-muted/50">
            {formatTime(entry.timestamp)}
          </span>

          {/* Agent badge */}
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 font-[family-name:var(--font-display)] text-[9px] font-bold tracking-wider ${colors.bg} ${colors.text} ${colors.border} border`}
          >
            {label}
          </span>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {isToolEntry ? (
              <div>
                <button
                  onClick={() => toggleTool(entry.id)}
                  className="flex items-center gap-1.5 text-left"
                >
                  <span className="text-[10px]">{TYPE_ICONS[entry.type]}</span>
                  <span
                    className={`font-[family-name:var(--font-code)] text-xs ${
                      entry.type === "tool-complete"
                        ? "text-status-live/70"
                        : "text-text-secondary"
                    }`}
                  >
                    {entry.content}
                  </span>
                  <svg
                    className={`h-3 w-3 text-text-muted transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
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
                {isExpanded && (
                  <pre className="mt-1 max-h-40 overflow-auto rounded border border-border-subtle bg-void/50 p-2 font-[family-name:var(--font-code)] text-[10px] text-text-muted">
                    {entry.toolArgs || entry.toolResult || "No data"}
                  </pre>
                )}
              </div>
            ) : (
              <span
                className={`font-[family-name:var(--font-code)] text-xs leading-relaxed ${
                  entry.type === "reasoning"
                    ? "italic text-text-muted"
                    : isError
                      ? "text-severity-critical"
                      : "text-text-primary/90"
                }`}
              >
                {entry.type === "reasoning" && (
                  <span className="mr-1 text-[10px]">🧠</span>
                )}
                {entry.content}
                {entry.type === "message" &&
                  activeAgent === entry.agent && (
                    <span className="ml-0.5 inline-block h-3 w-[2px] bg-current animate-typing-blink" />
                  )}
              </span>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="relative flex h-full flex-col">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-2"
      >
        {renderEntries()}
      </div>

      {/* Scroll-to-bottom button */}
      {!autoScroll && entries.length > 0 && (
        <button
          onClick={() => {
            setAutoScroll(true);
            scrollRef.current?.scrollTo({
              top: scrollRef.current.scrollHeight,
              behavior: "smooth",
            });
          }}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-border-active bg-elevated px-3 py-1.5 text-xs text-text-secondary shadow-lg transition-colors hover:bg-overlay hover:text-text-primary"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
            />
          </svg>
          Follow
        </button>
      )}
    </div>
  );
}
