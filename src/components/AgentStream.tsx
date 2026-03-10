"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentRole } from "@/lib/types";
import type { StreamEntry } from "@/components/Dashboard";
import { getAgentVisual } from "@/lib/agent-visuals";

const TYPE_ICONS: Record<StreamEntry["type"], string> = {
  message: "💬",
  "tool-start": "⚙️",
  "tool-complete": "✅",
  reasoning: "🧠",
  error: "❌",
  system: "📡",
};

// ─── Animation variants ──────────────────────────────────────────────────────

const entryVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 500, damping: 30 } },
};

const toolExpandVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: "auto", opacity: 1, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
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
  const isScrollingProgrammatically = useRef(false);

  // Auto-scroll to bottom whenever entries change
  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    // Double-rAF ensures DOM has painted with new content heights
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          isScrollingProgrammatically.current = true;
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          // Reset flag after scroll event fires
          timeoutId = setTimeout(() => { isScrollingProgrammatically.current = false; }, 50);
        }
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [entries, autoScroll]);

  // Detect ONLY user-initiated scrolls
  const handleScroll = useCallback(() => {
    // Skip scroll events caused by our programmatic scrollTop assignment
    if (isScrollingProgrammatically.current) return;
    const el = scrollRef.current;
    if (!el) return;
    // 150px threshold is generous — rapidly growing content won't accidentally disable auto-scroll
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
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
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="inline-block h-2.5 w-2.5 rounded-full bg-accent/50"
            />
            <span className="text-[10px] uppercase tracking-widest text-text-secondary">
              Awaiting agent activity
            </span>
          </div>
          <p className="max-w-xs text-center text-xs text-text-muted">
            Start the pipeline or connect to an active session
          </p>
        </div>
      );
    }

    return entries.map((entry) => {
      const isUserMessage = entry.type === "system" && entry.content.startsWith("[YOU]");
      const vis = !isUserMessage && entry.agent ? getAgentVisual(entry.agent) : null;
      const colors = isUserMessage
        ? { text: "text-accent", bg: "bg-accent/10", dot: "bg-accent", glow: "shadow-[0_0_8px_rgba(0,229,255,0.4)]", gradient: "from-accent/[0.04]" }
        : vis
          ? { text: vis.text, bg: vis.bgDim, dot: vis.bg, glow: vis.glow, gradient: vis.gradientFrom }
          : { text: "text-text-muted", bg: "bg-overlay", dot: "bg-text-muted", glow: "", gradient: "from-transparent" };
      const label = isUserMessage ? "YOU" : vis?.tag ?? "SYS";
      const isToolEntry =
        entry.type === "tool-start" || entry.type === "tool-complete";
      const isExpanded = expandedTools.has(entry.id);
      const isError = entry.type === "error";
      const isActive = activeAgent === entry.agent;

      return (
        <motion.div
          key={entry.id}
          variants={entryVariants}
          initial="hidden"
          animate="visible"
          className={`group relative flex gap-2.5 px-4 py-1.5 transition-colors hover:bg-white/[0.02] ${
            isError ? "bg-severity-critical/5" : ""
          } bg-gradient-to-r ${colors.gradient} to-transparent`}
        >
          {/* Active agent glow bar */}
          {isActive && (
            <motion.div
              layoutId="activeAgentBar"
              className={`absolute left-0 top-0 h-full w-[2px] ${colors.dot}`}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            />
          )}

          {/* Timestamp */}
          <span className="shrink-0 pt-0.5 font-mono text-[10px] text-text-muted/70">
            {formatTime(entry.timestamp)}
          </span>

          {/* Agent dot + label */}
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${colors.dot} ${colors.glow}`} />
            <span className={`text-[9px] font-bold tracking-wider ${colors.text}`}>
              {label}
            </span>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 overflow-hidden">
            {isToolEntry ? (
              <div>
                <button
                  onClick={() => toggleTool(entry.id)}
                  className="flex items-center gap-1.5 text-left"
                  aria-expanded={isExpanded}
                >
                  <span className="text-[10px]">{TYPE_ICONS[entry.type]}</span>
                  <span
                    className={`font-mono text-xs ${
                      entry.type === "tool-complete"
                        ? "text-status-live/70"
                        : "text-text-secondary"
                    }`}
                  >
                    {entry.content}
                  </span>
                  <motion.svg
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="h-3 w-3 text-text-muted"
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
                  </motion.svg>
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.pre
                      variants={toolExpandVariants}
                      initial="collapsed"
                      animate="expanded"
                      exit="collapsed"
                      className="mt-1.5 max-h-40 overflow-auto overflow-x-auto glass-panel rounded-lg p-2.5 font-mono text-[10px] text-text-secondary"
                    >
                      {entry.toolArgs || entry.toolResult || "No data"}
                    </motion.pre>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <span
                className={`whitespace-pre-wrap break-words font-mono text-xs leading-relaxed phosphor-text ${
                  isUserMessage
                    ? "font-semibold text-accent"
                    : entry.type === "reasoning"
                      ? "italic text-text-muted"
                      : isError
                        ? "text-severity-critical"
                        : "text-text-primary/90"
                }`}
              >
                {isUserMessage ? entry.content.replace(/^\[YOU\]\s*/, "") : entry.content}
                {entry.type === "message" && isActive && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                    className="ml-0.5 inline-block h-3.5 w-[2px] bg-accent"
                  />
                )}
              </span>
            )}
          </div>
        </motion.div>
      );
    });
  };

  return (
    <div className="relative flex h-full flex-col scanlines vignette">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-2"
      >
        {renderEntries()}
      </div>

      {/* Scroll-to-bottom button */}
      <AnimatePresence>
        {!autoScroll && entries.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => {
              setAutoScroll(true);
              scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
              });
            }}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 glass-panel rounded-full px-3 py-1.5 text-xs text-text-secondary shadow-elevation-2 transition-colors hover:text-text-primary"
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
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
