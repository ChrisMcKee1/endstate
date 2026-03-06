"use client";

import { useEffect, useRef, useReducer } from "react";
import confetti from "canvas-confetti";
import type { Task, PipelineState, SSEEvent } from "@/lib/types";
import {
  TASK_STATUSES,
  SEVERITIES,
  PIPELINE_STATUSES,
  SESSION_EVENT_TYPES,
} from "@/lib/types";

// ─── Achievement definitions ─────────────────────────────────────────────────

const ACHIEVEMENTS = {
  FIRST_FIX: { id: "first-fix", label: "First Fix", icon: "🔧", description: "First task resolved" },
  CLEAN_SWEEP: { id: "clean-sweep", label: "Clean Sweep", icon: "🧹", description: "All tasks resolved" },
  UX_CHAMPION: { id: "ux-champion", label: "UX Champion", icon: "✨", description: "UX score above 7/10" },
  ZERO_BUGS: { id: "zero-bugs", label: "Zero Bugs", icon: "🐛", description: "No open critical tasks" },
  CONVERGED: { id: "converged", label: "Converged", icon: "🎯", description: "Pipeline reached convergence" },
} as const;

const ALL_ACHIEVEMENTS = Object.values(ACHIEVEMENTS);

// ─── Reducer for celebration state ───────────────────────────────────────────

interface CelebrationState {
  badges: string[];
  banner: string | null;
}

type CelebrationAction =
  | { type: "ADD_BADGE"; id: string }
  | { type: "SHOW_BANNER"; text: string }
  | { type: "HIDE_BANNER" };

function celebrationReducer(
  state: CelebrationState,
  action: CelebrationAction,
): CelebrationState {
  switch (action.type) {
    case "ADD_BADGE":
      if (state.badges.includes(action.id)) return state;
      return { ...state, badges: [...state.badges, action.id] };
    case "SHOW_BANNER":
      return { ...state, banner: action.text };
    case "HIDE_BANNER":
      return { ...state, banner: null };
    default:
      return state;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface CelebrationEffectsProps {
  tasks: Task[];
  events: SSEEvent[];
}

export function CelebrationEffects({
  tasks,
  events,
}: CelebrationEffectsProps) {
  const [state, dispatch] = useReducer(celebrationReducer, {
    badges: [],
    banner: null,
  });

  const earned = useRef<Set<string>>(new Set());
  const prevResolvedCount = useRef(0);
  const prevEventsLen = useRef(0);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fire confetti + track milestones (external side effects only) ─────

  useEffect(() => {
    const resolvedCount = tasks.filter(
      (t) => t.status === TASK_STATUSES.RESOLVED,
    ).length;
    const openCount = tasks.filter(
      (t) =>
        t.status === TASK_STATUSES.OPEN ||
        t.status === TASK_STATUSES.IN_PROGRESS,
    ).length;
    const criticalOpen = tasks.filter(
      (t) =>
        t.severity === SEVERITIES.CRITICAL &&
        t.status !== TASK_STATUSES.RESOLVED &&
        t.status !== TASK_STATUSES.WONT_FIX,
    ).length;

    // First task resolved
    if (
      resolvedCount > 0 &&
      prevResolvedCount.current === 0 &&
      !earned.current.has(ACHIEVEMENTS.FIRST_FIX.id)
    ) {
      earned.current.add(ACHIEVEMENTS.FIRST_FIX.id);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#00CFFF", "#34D399", "#A78BFA"],
      });
    }

    // All critical resolved
    if (
      criticalOpen === 0 &&
      tasks.some((t) => t.severity === SEVERITIES.CRITICAL) &&
      !earned.current.has(ACHIEVEMENTS.ZERO_BUGS.id)
    ) {
      earned.current.add(ACHIEVEMENTS.ZERO_BUGS.id);
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        colors: ["#EF4444", "#22C55E", "#FBBF24", "#00CFFF"],
      });
    }

    // Zero open tasks
    if (
      tasks.length > 0 &&
      openCount === 0 &&
      !earned.current.has(ACHIEVEMENTS.CLEAN_SWEEP.id)
    ) {
      earned.current.add(ACHIEVEMENTS.CLEAN_SWEEP.id);
      confetti({
        particleCount: 300,
        spread: 160,
        origin: { y: 0.4 },
        startVelocity: 45,
        colors: ["#00CFFF", "#34D399", "#A78BFA", "#FBBF24", "#22C55E"],
      });
    }

    prevResolvedCount.current = resolvedCount;
  }, [tasks]);

  // ── Check SSE events for convergence ──────────────────────────────────

  useEffect(() => {
    if (events.length <= prevEventsLen.current) return;
    const newEvents = events.slice(prevEventsLen.current);
    prevEventsLen.current = events.length;

    for (const evt of newEvents) {
      if (
        evt.type === SESSION_EVENT_TYPES.PIPELINE_STATE_CHANGE &&
        (evt.data.state as PipelineState | undefined)?.status ===
          PIPELINE_STATUSES.STOPPED
      ) {
        if (!earned.current.has(ACHIEVEMENTS.CONVERGED.id)) {
          earned.current.add(ACHIEVEMENTS.CONVERGED.id);
          confetti({
            particleCount: 100,
            spread: 80,
            gravity: 0.6,
            origin: { y: 0.3 },
            colors: ["#00CFFF", "#A78BFA"],
          });
        }
      }
    }
  }, [events]);

  // ── Sync earned ref → reducer state (deferred to avoid lint) ──────────

  useEffect(() => {
    const earnedArr = Array.from(earned.current);
    for (const id of earnedArr) {
      if (!state.badges.includes(id)) {
        dispatch({ type: "ADD_BADGE", id });
      }
    }
  });

  // ── Banner management ─────────────────────────────────────────────────

  useEffect(() => {
    if (earned.current.size > 0) {
      const latest = Array.from(earned.current).pop();
      const achievement = ALL_ACHIEVEMENTS.find((a) => a.id === latest);
      if (achievement && state.banner !== achievement.description) {
        dispatch({ type: "SHOW_BANNER", text: achievement.description });
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        bannerTimer.current = setTimeout(
          () => dispatch({ type: "HIDE_BANNER" }),
          4000,
        );
      }
    }
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  });

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      {/* Banner */}
      {state.banner && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-[999] flex justify-center animate-fade-in-up">
          <div className="rounded-xl border border-accent/30 bg-surface/95 px-6 py-3 shadow-2xl backdrop-blur-md glow-accent">
            <p className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wider text-accent">
              {state.banner}
            </p>
          </div>
        </div>
      )}

      {/* Achievement badges (bottom-right) */}
      {state.badges.length > 0 && (
        <div className="fixed bottom-16 right-4 z-40 flex flex-col items-end gap-1.5">
          {state.badges.map((id) => {
            const achievement = ALL_ACHIEVEMENTS.find((a) => a.id === id);
            if (!achievement) return null;
            return (
              <div
                key={id}
                className="flex items-center gap-2 rounded-full border border-border-subtle bg-surface/90 px-3 py-1 shadow-lg backdrop-blur-sm animate-fade-in"
                title={achievement.description}
              >
                <span className="text-sm">{achievement.icon}</span>
                <span className="font-[family-name:var(--font-display)] text-[9px] font-bold uppercase tracking-wider text-accent">
                  {achievement.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
