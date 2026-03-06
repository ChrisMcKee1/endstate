"use client";

import { useEffect, useRef, useReducer, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import type { Task, PipelineState, SSEEvent } from "@/lib/types";
import {
  TASK_STATUSES,
  SEVERITIES,
  PIPELINE_STATUSES,
  SESSION_EVENT_TYPES,
} from "@/lib/types";

// ─── Brand palette for confetti ──────────────────────────────────────────────

const CONFETTI_COLORS = ["#00E5FF", "#00FFA3", "#B026FF", "#FFB800"];

// ─── Achievement definitions ─────────────────────────────────────────────────

const ACHIEVEMENTS = {
  FIRST_FIX: { id: "first-fix", label: "First Fix", icon: "🔧", description: "First task resolved", glow: "#00FFA3" },
  CLEAN_SWEEP: { id: "clean-sweep", label: "Clean Sweep", icon: "🧹", description: "All tasks resolved", glow: "#00E5FF" },
  UX_CHAMPION: { id: "ux-champion", label: "UX Champion", icon: "✨", description: "UX score above 7/10", glow: "#FFB800" },
  ZERO_BUGS: { id: "zero-bugs", label: "Zero Bugs", icon: "🐛", description: "No open critical tasks", glow: "#B026FF" },
  CONVERGED: { id: "converged", label: "Converged", icon: "🎯", description: "Pipeline reached convergence", glow: "#00E5FF" },
} as const;

const ALL_ACHIEVEMENTS = Object.values(ACHIEVEMENTS);

const SPRING = { type: "spring" as const, stiffness: 300, damping: 24 };

// ─── Reducer ─────────────────────────────────────────────────────────────────

interface CelebrationState {
  badges: string[];
  banner: string | null;
}

type CelebrationAction =
  | { type: "ADD_BADGE"; id: string }
  | { type: "SHOW_BANNER"; text: string }
  | { type: "HIDE_BANNER" };

function celebrationReducer(state: CelebrationState, action: CelebrationAction): CelebrationState {
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

export function CelebrationEffects({ tasks, events }: CelebrationEffectsProps) {
  const [state, dispatch] = useReducer(celebrationReducer, { badges: [], banner: null });

  const earned = useRef<Set<string>>(new Set());
  const prevResolvedCount = useRef(0);
  const prevEventsLen = useRef(0);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const awardAchievement = useCallback((id: string): boolean => {
    if (earned.current.has(id)) return false;
    earned.current.add(id);
    dispatch({ type: "ADD_BADGE", id });
    const ach = ALL_ACHIEVEMENTS.find((a) => a.id === id);
    if (ach) {
      dispatch({ type: "SHOW_BANNER", text: ach.description });
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      bannerTimer.current = setTimeout(() => dispatch({ type: "HIDE_BANNER" }), 4000);
    }
    return true;
  }, []);

  useEffect(() => {
    const resolvedCount = tasks.filter((t) => t.status === TASK_STATUSES.RESOLVED).length;
    const openCount = tasks.filter(
      (t) => t.status === TASK_STATUSES.OPEN || t.status === TASK_STATUSES.IN_PROGRESS,
    ).length;
    const criticalOpen = tasks.filter(
      (t) =>
        t.severity === SEVERITIES.CRITICAL &&
        t.status !== TASK_STATUSES.RESOLVED &&
        t.status !== TASK_STATUSES.WONT_FIX,
    ).length;

    if (resolvedCount > 0 && prevResolvedCount.current === 0) {
      if (awardAchievement(ACHIEVEMENTS.FIRST_FIX.id)) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: CONFETTI_COLORS });
      }
    }

    if (
      criticalOpen === 0 &&
      tasks.some((t) => t.severity === SEVERITIES.CRITICAL)
    ) {
      if (awardAchievement(ACHIEVEMENTS.ZERO_BUGS.id)) {
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
      }
    }

    if (tasks.length > 0 && openCount === 0) {
      if (awardAchievement(ACHIEVEMENTS.CLEAN_SWEEP.id)) {
        confetti({
          particleCount: 300,
          spread: 160,
          origin: { y: 0.4 },
          startVelocity: 45,
          colors: CONFETTI_COLORS,
        });
      }
    }

    prevResolvedCount.current = resolvedCount;
  }, [tasks, awardAchievement]);

  useEffect(() => {
    if (events.length <= prevEventsLen.current) return;
    const newEvents = events.slice(prevEventsLen.current);
    prevEventsLen.current = events.length;

    for (const evt of newEvents) {
      if (
        evt.type === SESSION_EVENT_TYPES.PIPELINE_STATE_CHANGE &&
        (evt.data.state as PipelineState | undefined)?.status === PIPELINE_STATUSES.STOPPED
      ) {
        if (awardAchievement(ACHIEVEMENTS.CONVERGED.id)) {
          confetti({
            particleCount: 100,
            spread: 80,
            gravity: 0.6,
            origin: { y: 0.3 },
            colors: CONFETTI_COLORS,
          });
        }
      }
    }
  }, [events, awardAchievement]);

  useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  return (
    <>
      {/* Banner */}
      <AnimatePresence>
        {state.banner && (
          <motion.div
            className="pointer-events-none fixed inset-x-0 top-16 z-[999] flex justify-center"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={SPRING}
          >
            <div
              className="rounded-2xl border border-white/[0.08] px-6 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl"
              style={{
                background: "rgba(20, 21, 31, 0.85)",
                boxShadow: "0 0 20px rgba(0, 229, 255, 0.15), 0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              <p className="text-sm font-bold uppercase tracking-wider text-accent">
                {state.banner}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievement badges */}
      {state.badges.length > 0 && (
        <div className="fixed bottom-16 right-4 z-40 flex flex-col items-end gap-2">
          {state.badges.map((id, idx) => {
            const achievement = ALL_ACHIEVEMENTS.find((a) => a.id === id);
            if (!achievement) return null;
            return (
              <motion.div
                key={id}
                className="flex items-center gap-2 rounded-full border border-white/[0.08] px-3.5 py-1.5 shadow-lg backdrop-blur-xl"
                style={{
                  background: "rgba(20, 21, 31, 0.8)",
                  boxShadow: `0 0 12px ${achievement.glow}20`,
                }}
                initial={{ opacity: 0, x: 40, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ ...SPRING, delay: idx * 0.1 }}
                title={achievement.description}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-sm"
                  style={{ boxShadow: `0 0 8px ${achievement.glow}40` }}
                >
                  {achievement.icon}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-accent">
                  {achievement.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}
