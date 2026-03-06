"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Task } from "@/lib/types";
import { AGENT_ROLES, TASK_STATUSES } from "@/lib/types";

// ── UX categories ────────────────────────────────────────────────────────────

const UX_CATEGORIES = [
  { key: "navigation", label: "Navigation", icon: "🧭" },
  { key: "errors", label: "Error Handling", icon: "⚠️" },
  { key: "empty-states", label: "Empty States", icon: "📭" },
  { key: "language", label: "Language & Copy", icon: "💬" },
  { key: "accessibility", label: "Accessibility", icon: "♿" },
  { key: "visual", label: "Visual Design", icon: "🎨" },
  { key: "performance", label: "Perceived Speed", icon: "⚡" },
] as const;

const SPRING = { type: "spring" as const, stiffness: 260, damping: 26 };

function scoreBarColor(score: number): string {
  if (score >= 8) return "#00FFA3";
  if (score >= 5) return "#EAB308";
  return "#EF4444";
}

function scoreTextColor(score: number): string {
  if (score >= 8) return "text-status-live";
  if (score >= 6) return "text-severity-medium";
  if (score >= 4) return "text-severity-high";
  return "text-severity-critical";
}

function verdictText(score: number): string {
  if (score >= 8) return "Ready for production. Users will love this.";
  if (score >= 6) return "Acceptable but could use refinement in key areas.";
  if (score >= 4) return "Needs significant UX improvements before launch.";
  return "Critical UX issues found. Major rework needed.";
}

// ─── Component ───────────────────────────────────────────────────────────────

interface UxScorecardProps {
  tasks: Task[];
}

export function UxScorecard({ tasks }: UxScorecardProps) {
  const uxData = useMemo(() => {
    const uxTasks = tasks.filter((t) =>
      t.timeline.some((e) => e.agent === AGENT_ROLES.UX_REVIEWER),
    );

    const scores: Record<string, number[]> = {};
    for (const cat of UX_CATEGORIES) {
      scores[cat.key] = [];
    }

    for (const task of uxTasks) {
      for (const event of task.timeline) {
        if (event.agent !== AGENT_ROLES.UX_REVIEWER) continue;
        for (const cat of UX_CATEGORIES) {
          const regex = new RegExp(`${cat.key}[:\\s]+(\\d+)`, "i");
          const match = event.detail.match(regex);
          if (match) {
            scores[cat.key].push(parseInt(match[1], 10));
          }
        }
      }
    }

    const avgScores = UX_CATEGORIES.map((cat) => {
      const vals = scores[cat.key];
      const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return { ...cat, score: Math.round(avg * 10) / 10, hasData: vals.length > 0 };
    });

    const validScores = avgScores.filter((s) => s.hasData);
    const overallScore =
      validScores.length > 0
        ? Math.round((validScores.reduce((a, b) => a + b.score, 0) / validScores.length) * 10) / 10
        : 0;

    const totalUxTasks = uxTasks.length;
    const resolvedUx = uxTasks.filter((t) => t.status === TASK_STATUSES.RESOLVED).length;

    return { scores: avgScores, overallScore, totalUxTasks, resolvedUx, hasData: validScores.length > 0 };
  }, [tasks]);

  const isGolden = uxData.overallScore > 7;

  // Ring metrics
  const RING_RADIUS = 32;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const ringProgress = uxData.hasData ? (uxData.overallScore / 10) * RING_CIRCUMFERENCE : 0;

  return (
    <div className={`flex h-full flex-col overflow-y-auto ${isGolden ? "animate-golden-glow" : ""}`}>
      {/* Overall score ring */}
      <div className="border-b border-white/[0.04] p-4 text-center">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-text-muted">
          UX Score
        </p>
        {uxData.hasData ? (
          <>
            <div className="relative mx-auto h-[76px] w-[76px]">
              <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
                {/* Background ring */}
                <circle
                  cx={40}
                  cy={40}
                  r={RING_RADIUS}
                  fill="none"
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth={4}
                />
                {/* Score ring */}
                <motion.circle
                  cx={40}
                  cy={40}
                  r={RING_RADIUS}
                  fill="none"
                  stroke={scoreBarColor(uxData.overallScore)}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
                  animate={{ strokeDashoffset: RING_CIRCUMFERENCE - ringProgress }}
                  transition={SPRING}
                />
                {isGolden && (
                  <motion.circle
                    cx={40}
                    cy={40}
                    r={RING_RADIUS}
                    fill="none"
                    stroke="#FFB800"
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={RING_CIRCUMFERENCE - ringProgress}
                    opacity={0.15}
                    animate={{ opacity: [0.1, 0.25, 0.1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </svg>
              {/* Center number */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  key={uxData.overallScore}
                  className={`font-mono text-xl font-bold ${scoreTextColor(uxData.overallScore)}`}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={SPRING}
                >
                  {uxData.overallScore}
                </motion.span>
                <span className="text-[8px] text-text-muted">/ 10</span>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-text-muted">
              {uxData.totalUxTasks} findings · {uxData.resolvedUx} resolved
            </p>
            {isGolden && (
              <motion.p
                className="mt-1 text-[10px] font-semibold text-agent-ux"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SPRING}
              >
                ✨ Excellent UX
              </motion.p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <span className="text-3xl">👁️</span>
            <p className="text-xs text-text-muted">No UX review data yet</p>
            <p className="text-[10px] text-text-muted/60">Scores appear after UX Reviewer runs</p>
          </div>
        )}
      </div>

      {/* Category scores */}
      <div className="flex-1 p-3">
        {UX_CATEGORIES.map((cat, idx) => {
          const data = uxData.scores.find((s) => s.key === cat.key);
          const score = data?.score ?? 0;
          const hasData = data?.hasData ?? false;

          return (
            <motion.div
              key={cat.key}
              className="mb-3"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...SPRING, delay: idx * 0.04 }}
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{cat.icon}</span>
                  <span className="text-[11px] text-text-secondary">{cat.label}</span>
                </div>
                <span
                  className={`font-mono text-xs font-bold ${
                    hasData ? scoreTextColor(score) : "text-text-muted/30"
                  }`}
                >
                  {hasData ? score.toFixed(1) : "—"}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.03]">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: hasData ? scoreBarColor(score) : "rgba(255,255,255,0.04)" }}
                  initial={{ width: "0%" }}
                  animate={{ width: hasData ? `${(score / 10) * 100}%` : "0%" }}
                  transition={SPRING}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Verdict */}
      <AnimatePresence mode="wait">
        {uxData.hasData && (
          <motion.div
            key={verdictText(uxData.overallScore)}
            className="border-t border-white/[0.04] p-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING}
          >
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
              Verdict
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {verdictText(uxData.overallScore)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
