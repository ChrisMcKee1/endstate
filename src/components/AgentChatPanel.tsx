"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentRole } from "@/lib/types";
import type { StreamEntry } from "@/components/Dashboard";
import { getAgentVisual } from "@/lib/agent-visuals";

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

const toolExpandVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: "auto", opacity: 1, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
};

// ─── Component ───────────────────────────────────────────────────────────────

interface AgentChatPanelProps {
  agent: AgentRole;
  entries: StreamEntry[];
  isActive: boolean;
  isCompleted: boolean;
  onClose: () => void;
}

export function AgentChatPanel({
  agent,
  entries,
  isActive,
  isCompleted,
  onClose,
}: AgentChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const isScrollingProgrammatically = useRef(false);

  const vis = getAgentVisual(agent);
  const meta = { label: vis.label, color: vis.hex };

  // Auto-scroll to bottom
  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          isScrollingProgrammatically.current = true;
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          timeoutId = setTimeout(() => { isScrollingProgrammatically.current = false; }, 50);
        }
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [entries, autoScroll]);

  const handleScroll = useCallback(() => {
    if (isScrollingProgrammatically.current) return;
    const el = scrollRef.current;
    if (!el) return;
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

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const statusLabel = isActive ? "ACTIVE" : isCompleted ? "COMPLETED" : "WAITING";
  const statusColor = isActive ? "text-status-live" : isCompleted ? meta.color : "text-text-muted";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="glass-panel flex h-full w-[480px] flex-col rounded-l-2xl border-r-0 shadow-elevation-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: meta.color,
                boxShadow: isActive ? `0 0 10px ${meta.color}60` : "none",
              }}
            />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                {meta.label}
              </h2>
              <span className={`text-[9px] uppercase tracking-widest ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
            aria-label="Close agent chat"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        </div>

        {/* Chat entries */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto py-2"
        >
          {entries.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-text-muted">
              {isActive ? (
                <>
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span className="text-[10px] uppercase tracking-widest text-text-secondary">
                    {meta.label} is working...
                  </span>
                </>
              ) : (
                <span className="text-[10px] uppercase tracking-widest text-text-secondary">
                  Waiting for {meta.label.toLowerCase()} to start
                </span>
              )}
            </div>
          ) : (
            entries.map((entry) => {
              const isToolEntry = entry.type === "tool-start" || entry.type === "tool-complete";
              const isExpanded = expandedTools.has(entry.id);
              const isError = entry.type === "error";

              return (
                <div
                  key={entry.id}
                  className={`group relative flex gap-2.5 px-4 py-1.5 transition-colors hover:bg-white/[0.02] ${
                    isError ? "bg-severity-critical/5" : ""
                  }`}
                >
                  <span className="shrink-0 pt-0.5 font-mono text-[10px] text-text-muted/70">
                    {formatTime(entry.timestamp)}
                  </span>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    {isToolEntry ? (
                      <div>
                        <button
                          onClick={() => toggleTool(entry.id)}
                          className="flex items-center gap-1.5 text-left"
                          aria-expanded={isExpanded}
                        >
                          <span className="text-[10px]">
                            {entry.type === "tool-complete" ? "\u2705" : "\u2699\uFE0F"}
                          </span>
                          <span className={`font-mono text-xs ${
                            entry.type === "tool-complete" ? "text-status-live/70" : "text-text-secondary"
                          }`}>
                            {entry.content}
                          </span>
                          <motion.svg
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="h-3 w-3 text-text-muted"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </motion.svg>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.pre
                              variants={toolExpandVariants}
                              initial="collapsed"
                              animate="expanded"
                              exit="collapsed"
                              className="mt-1.5 max-h-40 overflow-auto glass-panel rounded-lg p-2.5 font-mono text-[10px] text-text-secondary"
                            >
                              {entry.toolArgs || entry.toolResult || "No data"}
                            </motion.pre>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <span
                        className={`whitespace-pre-wrap break-words font-mono text-xs leading-relaxed ${
                          entry.type === "reasoning"
                            ? "italic text-text-muted"
                            : isError
                              ? "text-severity-critical"
                              : "text-text-primary/90"
                        }`}
                      >
                        {entry.content}
                        {entry.type === "message" && isActive && entry === entries[entries.length - 1] && (
                          <motion.span
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                            className="ml-0.5 inline-block h-3.5 w-[2px]"
                            style={{ backgroundColor: meta.color }}
                          />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
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
                scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
              }}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 glass-panel rounded-full px-3 py-1.5 text-xs text-text-secondary shadow-elevation-2 transition-colors hover:text-text-primary"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
              </svg>
              Follow
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
