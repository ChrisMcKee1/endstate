"use client";

import { useState, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

// ─── Constants (hoisted) ─────────────────────────────────────────────────────

const SPRING = { type: "spring" as const, stiffness: 400, damping: 25 };

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

interface VisionPanelProps {
  inspiration: string;
  onUpdate: (vision: string) => void;
  isRunning: boolean;
}

export function VisionPanel({ inspiration, onUpdate, isRunning }: VisionPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(inspiration);
  const [isSaving, startSaveTransition] = useTransition();

  const handleEdit = useCallback(() => {
    setEditValue(inspiration);
    setIsEditing(true);
  }, [inspiration]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(inspiration);
  }, [inspiration]);

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    startSaveTransition(async () => {
      onUpdate(trimmed);
      setIsEditing(false);
    });
  }, [editValue, onUpdate, startSaveTransition]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleSave, handleCancel],
  );

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (!inspiration && !isEditing) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/5 text-3xl">
          💡
        </div>
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-text-primary">
          No Vision Set
        </h3>
        <p className="mb-4 max-w-[240px] text-[11px] leading-relaxed text-text-muted">
          Start the pipeline or set a vision to guide agent behavior throughout
          the autonomous development cycle.
        </p>
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(0,229,255,0.15)" }}
          whileTap={{ scale: 0.95 }}
          transition={SPRING}
          onClick={handleEdit}
          className="rounded-xl bg-accent/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-accent transition-colors hover:bg-accent/20"
        >
          Set Vision
        </motion.button>
      </div>
    );
  }

  // ── Edit mode ───────────────────────────────────────────────────────────────

  if (isEditing) {
    return (
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-primary">
            Edit Vision
          </h3>
          <div className="flex items-center gap-1.5">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING}
              onClick={handleCancel}
              className="rounded-lg border border-border-subtle px-2.5 py-1 text-[10px] text-text-muted transition-colors hover:text-text-primary"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 12px rgba(0,255,163,0.15)" }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING}
              onClick={handleSave}
              disabled={isSaving || !editValue.trim()}
              className="rounded-lg bg-status-live/10 border border-status-live/20 px-2.5 py-1 text-[10px] font-semibold text-status-live transition-colors hover:bg-status-live/20 disabled:opacity-40"
            >
              {isSaving ? "Saving…" : "Save"}
            </motion.button>
          </div>
        </div>

        {/* Scenario templates */}
        <div className="mb-3 grid grid-cols-2 gap-1.5">
          {SCENARIO_TEMPLATES.map((scenario) => {
            const isSelected = editValue === scenario.value && scenario.value;
            return (
              <motion.button
                key={scenario.label}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={SPRING}
                onClick={() => {
                  if (scenario.value) setEditValue(scenario.value);
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
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your vision in detail. What are you building? Who is it for?"
          rows={8}
          autoFocus
          className="flex-1 resize-none rounded-xl border border-border-subtle bg-void/50 px-4 py-3 text-xs text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:shadow-[inset_0_1px_4px_rgba(0,0,0,0.3)] focus:outline-none focus:ring-1 focus:ring-accent/20"
        />

        <p className="mt-2 text-[10px] text-text-muted">
          Ctrl+S to save · Esc to cancel
        </p>
      </div>
    );
  }

  // ── View mode ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">💡</span>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-primary">
            Vision
          </h3>
          {isRunning && (
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="h-1.5 w-1.5 rounded-full bg-status-live"
            />
          )}
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={SPRING}
          onClick={handleEdit}
          className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
          aria-label="Edit vision"
          title="Edit vision"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        </motion.button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key="vision-content"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <MarkdownRenderer content={inspiration} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer badge */}
      <div className="shrink-0 border-t border-border-subtle px-4 py-2.5">
        <p className="text-[10px] text-text-muted">
          This vision guides all agent behavior throughout the pipeline.
        </p>
      </div>
    </div>
  );
}
