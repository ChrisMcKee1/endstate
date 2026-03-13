"use client";

import { useState, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Task } from "@/lib/types";

// ─── Constants (hoisted) ─────────────────────────────────────────────────────

const SPRING = { type: "spring" as const, stiffness: 400, damping: 28 };

const SCENARIO_TEMPLATES = [
  {
    label: "Review & Fix Everything",
    value:
      "Review this entire application. Find all bugs, errors, broken flows, and UX issues. Fix everything you find. Keep iterating until the app is stable and polished.",
    icon: "🔍",
  },
  {
    label: "Improve UX",
    value:
      "Evaluate this application from a real user's perspective. Fix confusing navigation, unclear error messages, empty states, accessibility issues, and anything that would frustrate a non-technical user.",
    icon: "✨",
  },
  {
    label: "Security Scan",
    value:
      "Perform a thorough security review. Check for injection vulnerabilities, auth issues, exposed secrets, insecure configurations, CORS problems, and common OWASP Top 10 risks. Fix all vulnerabilities found.",
    icon: "🔒",
  },
  {
    label: "Refactor for Quality",
    value:
      "Analyze the codebase for code quality issues. Refactor complex functions, remove dead code, improve error handling, add missing types, fix anti-patterns, and improve overall maintainability.",
    icon: "🏗️",
  },
  {
    label: "Build from Scratch",
    value: "",
    icon: "🆕",
  },
  {
    label: "Custom",
    value: "",
    icon: "✏️",
  },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

const MODAL_VIEWS = {
  CHOOSE: "choose",
  VISION: "vision",
} as const;
type ModalView = (typeof MODAL_VIEWS)[keyof typeof MODAL_VIEWS];

interface StartNewModalProps {
  tasks: Task[];
  onResume: () => void;
  onNewVision: (vision: string) => void;
  onClose: () => void;
}

export function StartNewModal({ tasks, onResume, onNewVision, onClose }: StartNewModalProps) {
  const openTasks = tasks.filter((t) => t.status === "open" || t.status === "in-progress");
  const hasOpenTasks = openTasks.length > 0;

  // If no tasks, go straight to vision input
  const [view, setView] = useState<ModalView>(hasOpenTasks ? MODAL_VIEWS.CHOOSE : MODAL_VIEWS.VISION);
  const [vision, setVision] = useState("");
  const [isStarting, startTransition] = useTransition();

  const handleStartNewVision = useCallback(() => {
    const trimmed = vision.trim();
    if (!trimmed) return;
    startTransition(() => {
      onNewVision(trimmed);
    });
  }, [vision, onNewVision, startTransition]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleStartNewVision();
      }
      if (e.key === "Escape") {
        onClose();
      }
    },
    [handleStartNewVision, onClose],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 10 }}
        transition={SPRING}
        className="glass-panel w-full max-w-md rounded-2xl"
        role="dialog"
        aria-modal="true"
      >
        <AnimatePresence mode="wait">
          {/* ── Choose view: resume or new ────────────────────────────── */}
          {view === MODAL_VIEWS.CHOOSE && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="p-6"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                Start Pipeline
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                You have{" "}
                <span className="font-bold text-accent">{openTasks.length}</span>{" "}
                remaining {openTasks.length === 1 ? "task" : "tasks"} from the previous run.
              </p>

              <div className="mt-5 space-y-2">
                {/* Resume option */}
                <motion.button
                  whileHover={{ scale: 1.01, boxShadow: "0 0 16px rgba(0,229,255,0.15)" }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING}
                  onClick={() => {
                    onResume();
                    onClose();
                  }}
                  className="group flex w-full items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4 text-left transition-colors hover:border-accent/40 hover:bg-accent/10"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="6,4 20,12 6,20" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-text-primary">
                      Pick Up Remaining Tasks
                    </span>
                    <p className="mt-0.5 text-[10px] text-text-muted">
                      Resume working on {openTasks.length} open{" "}
                      {openTasks.length === 1 ? "task" : "tasks"} from the previous pipeline run.
                    </p>
                  </div>
                </motion.button>

                {/* New vision option */}
                <motion.button
                  whileHover={{ scale: 1.01, boxShadow: "0 0 16px rgba(0,255,163,0.12)" }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING}
                  onClick={() => setView(MODAL_VIEWS.VISION)}
                  className="group flex w-full items-start gap-3 rounded-xl border border-status-live/20 bg-status-live/5 p-4 text-left transition-colors hover:border-status-live/40 hover:bg-status-live/10"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-status-live/10 text-status-live">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-text-primary">
                      New Vision
                    </span>
                    <p className="mt-0.5 text-[10px] text-text-muted">
                      Start fresh with a new set of goals. Previous tasks will be cleared.
                    </p>
                  </div>
                </motion.button>
              </div>

              <div className="mt-4 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="rounded-lg border border-border-subtle bg-void/50 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Vision input view ─────────────────────────────────────── */}
          {view === MODAL_VIEWS.VISION && (
            <motion.div
              key="vision"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.15 }}
              className="p-6"
            >
              <div className="mb-4 flex items-center gap-2">
                {hasOpenTasks && (
                  <motion.button
                    whileHover={{ x: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setView(MODAL_VIEWS.CHOOSE)}
                    className="text-xs text-text-muted transition-colors hover:text-text-primary"
                  >
                    ←
                  </motion.button>
                )}
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                  New Vision
                </h3>
              </div>
              <p className="mb-4 text-xs text-text-muted">
                Describe what you want the agents to do. This guides all agent
                behavior throughout the pipeline.
              </p>

              {/* Scenario templates */}
              <div className="mb-3 grid grid-cols-2 gap-1.5">
                {SCENARIO_TEMPLATES.map((scenario) => {
                  const isSelected = vision === scenario.value && scenario.value;
                  return (
                    <motion.button
                      key={scenario.label}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={SPRING}
                      onClick={() => {
                        if (scenario.value) setVision(scenario.value);
                      }}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-[10px] transition-colors ${
                        isSelected
                          ? "border-accent/40 bg-accent/5 text-accent"
                          : "border-border-subtle bg-void/30 text-text-secondary hover:border-border-active"
                      }`}
                    >
                      <span>{scenario.icon}</span>
                      <span className="font-medium">{scenario.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              <textarea
                value={vision}
                onChange={(e) => setVision(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your vision in detail. What are you building? Who is it for? What should the agents focus on?"
                rows={6}
                autoFocus
                className="w-full resize-none rounded-xl border border-border-subtle bg-void/50 px-4 py-3 text-xs text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:shadow-[inset_0_1px_4px_rgba(0,0,0,0.3)] focus:outline-none focus:ring-1 focus:ring-accent/20"
              />

              <p className="mt-1.5 text-[10px] text-text-muted">
                Ctrl+Enter to start
              </p>

              <div className="mt-4 flex items-center justify-end gap-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="rounded-lg border border-border-subtle bg-void/50 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(0,255,163,0.2)" }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleStartNewVision}
                  disabled={isStarting || !vision.trim()}
                  className="rounded-lg bg-status-live/10 border border-status-live/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-status-live transition-colors hover:bg-status-live/20 disabled:opacity-40"
                >
                  {isStarting ? "Starting…" : "Start Pipeline"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
