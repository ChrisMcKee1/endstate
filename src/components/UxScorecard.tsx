"use client";

import { useMemo } from "react";
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

function scoreColor(score: number): string {
  if (score >= 8) return "bg-status-live";
  if (score >= 6) return "bg-severity-medium";
  if (score >= 4) return "bg-severity-high";
  return "bg-severity-critical";
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
  // Derive UX scores from UX reviewer tasks
  const uxData = useMemo(() => {
    const uxTasks = tasks.filter((t) =>
      t.timeline.some((e) => e.agent === AGENT_ROLES.UX_REVIEWER),
    );

    const scores: Record<string, number[]> = {};
    for (const cat of UX_CATEGORIES) {
      scores[cat.key] = [];
    }

    // Parse UX scores from task tags/timeline
    for (const task of uxTasks) {
      for (const event of task.timeline) {
        if (event.agent !== AGENT_ROLES.UX_REVIEWER) continue;

        // Look for score data in the detail text (e.g., "navigation: 7/10")
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
      const avg =
        vals.length > 0
          ? vals.reduce((a, b) => a + b, 0) / vals.length
          : 0;
      return { ...cat, score: Math.round(avg * 10) / 10, hasData: vals.length > 0 };
    });

    const validScores = avgScores.filter((s) => s.hasData);
    const overallScore =
      validScores.length > 0
        ? Math.round(
            (validScores.reduce((a, b) => a + b.score, 0) /
              validScores.length) *
              10,
          ) / 10
        : 0;

    const totalUxTasks = uxTasks.length;
    const resolvedUx = uxTasks.filter(
      (t) => t.status === TASK_STATUSES.RESOLVED,
    ).length;

    return { scores: avgScores, overallScore, totalUxTasks, resolvedUx, hasData: validScores.length > 0 };
  }, [tasks]);

  const isGolden = uxData.overallScore > 7;

  return (
    <div className={`flex h-full flex-col overflow-y-auto ${isGolden ? "animate-golden-glow" : ""}`}>
      {/* Overall score */}
      <div className="border-b border-border-subtle p-4 text-center">
        <p className="mb-2 font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest text-text-muted">
          UX Score
        </p>
        {uxData.hasData ? (
          <>
            <div
              className={`inline-flex h-16 w-16 items-center justify-center rounded-full border-2 ${
                isGolden
                  ? "border-agent-ux bg-agent-ux/10"
                  : "border-border-active bg-elevated"
              }`}
            >
              <span
                className={`font-[family-name:var(--font-display)] text-2xl font-bold ${scoreTextColor(uxData.overallScore)}`}
              >
                {uxData.overallScore}
              </span>
            </div>
            <p className="mt-2 text-[10px] text-text-muted">
              {uxData.totalUxTasks} findings · {uxData.resolvedUx} resolved
            </p>
            {isGolden && (
              <p className="mt-1 text-[10px] font-semibold text-agent-ux">
                ✨ Excellent UX
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <span className="text-3xl">👁️</span>
            <p className="text-xs text-text-muted">
              No UX review data yet
            </p>
            <p className="text-[10px] text-text-muted/60">
              Scores appear after UX Reviewer runs
            </p>
          </div>
        )}
      </div>

      {/* Category scores */}
      <div className="flex-1 p-3">
        {UX_CATEGORIES.map((cat) => {
          const data = uxData.scores.find((s) => s.key === cat.key);
          const score = data?.score ?? 0;
          const hasData = data?.hasData ?? false;

          return (
            <div key={cat.key} className="mb-3">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{cat.icon}</span>
                  <span className="text-[11px] text-text-secondary">
                    {cat.label}
                  </span>
                </div>
                <span
                  className={`font-[family-name:var(--font-code)] text-xs font-bold ${
                    hasData ? scoreTextColor(score) : "text-text-muted/30"
                  }`}
                >
                  {hasData ? score.toFixed(1) : "—"}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-void/50">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    hasData ? scoreColor(score) : "bg-border-subtle"
                  }`}
                  style={{ width: hasData ? `${(score / 10) * 100}%` : "0%" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Verdict */}
      {uxData.hasData && (
        <div className="border-t border-border-subtle p-3">
          <p className="font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest text-text-muted">
            Verdict
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {verdictText(uxData.overallScore)}
          </p>
        </div>
      )}
    </div>
  );
}
