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

// canvas-confetti requires raw hex values — cannot use CSS variables
const CONFETTI_COLORS = ["#00E5FF", "#00FFA3", "#B026FF", "#FFB800"];
const GOLD_COLORS = ["#FFE400", "#FFBD00", "#E89400", "#FFCA6C", "#FDFFB8"];

// ─── Enhanced confetti effects ───────────────────────────────────────────────

function sideCannons(colors: string[] = CONFETTI_COLORS) {
  const end = Date.now() + 2500;
  const frame = () => {
    if (Date.now() > end) return;
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      startVelocity: 60,
      origin: { x: 0, y: 0.5 },
      colors,
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      startVelocity: 60,
      origin: { x: 1, y: 0.5 },
      colors,
    });
    requestAnimationFrame(frame);
  };
  frame();
}

function fireworks(durationMs = 4000) {
  const end = Date.now() + durationMs;
  const defaults = {
    startVelocity: 30,
    spread: 360,
    ticks: 60,
    zIndex: 100,
    colors: CONFETTI_COLORS,
  };
  const interval = setInterval(() => {
    if (Date.now() > end) return clearInterval(interval);
    const count = 50 * ((end - Date.now()) / durationMs);
    confetti({
      ...defaults,
      particleCount: count,
      origin: { x: Math.random() * 0.6 + 0.2, y: Math.random() * 0.4 },
    });
  }, 250);
}

function goldStars() {
  const defaults = {
    spread: 360,
    ticks: 50,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    colors: GOLD_COLORS,
  };
  confetti({
    ...defaults,
    particleCount: 40,
    scalar: 1.2,
    shapes: ["star" as const],
  });
  confetti({
    ...defaults,
    particleCount: 10,
    scalar: 0.75,
    shapes: ["circle" as const],
  });
}

function smallBurst(
  origin: { x: number; y: number } = { x: 0.5, y: 0.7 },
  colors: string[] = CONFETTI_COLORS,
) {
  confetti({
    particleCount: 50,
    spread: 60,
    origin,
    colors,
    startVelocity: 25,
  });
}

// ─── Achievement definitions ─────────────────────────────────────────────────

// Glow values use raw hex because they're concatenated with hex opacity suffixes
// (e.g., `${glow}20`) in boxShadow strings — CSS vars can't be used that way.
const ACHIEVEMENTS = {
  FIRST_FIX: { id: "first-fix", label: "First Fix", icon: "🔧", description: "First task resolved", glow: "#00FFA3" },
  CLEAN_SWEEP: { id: "clean-sweep", label: "Clean Sweep", icon: "🧹", description: "All tasks resolved", glow: "#00E5FF" },
  UX_CHAMPION: { id: "ux-champion", label: "UX Champion", icon: "✨", description: "UX score above 7/10", glow: "#FFB800" },
  ZERO_BUGS: { id: "zero-bugs", label: "Zero Bugs", icon: "🐛", description: "No open critical tasks", glow: "#B026FF" },
  CONVERGED: { id: "converged", label: "Converged", icon: "🎯", description: "Pipeline reached convergence", glow: "#00E5FF" },
  BUILD_PASS: { id: "build-pass", label: "Build Pass", icon: "✅", description: "Build succeeded", glow: "#00FFA3" },
  BUILD_FAIL: { id: "build-fail", label: "Build Fail", icon: "💥", description: "Build failed", glow: "#EF4444" },
} as const;

const ALL_ACHIEVEMENTS = Object.values(ACHIEVEMENTS);

const SPRING = { type: "spring" as const, stiffness: 300, damping: 24 };

// ─── Reducer ─────────────────────────────────────────────────────────────────

interface CelebrationState {
  badges: string[];
  banner: string | null;
  screenShake: boolean;
}

type CelebrationAction =
  | { type: "ADD_BADGE"; id: string }
  | { type: "SHOW_BANNER"; text: string }
  | { type: "HIDE_BANNER" }
  | { type: "SCREEN_SHAKE"; active: boolean };

function celebrationReducer(state: CelebrationState, action: CelebrationAction): CelebrationState {
  switch (action.type) {
    case "ADD_BADGE":
      if (state.badges.includes(action.id)) return state;
      return { ...state, badges: [...state.badges, action.id] };
    case "SHOW_BANNER":
      return { ...state, banner: action.text };
    case "HIDE_BANNER":
      return { ...state, banner: null };
    case "SCREEN_SHAKE":
      return { ...state, screenShake: action.active };
    default:
      return state;
  }
}

// ─── Persistence key for earned achievements ────────────────────────────────

const EARNED_STORAGE_KEY = "endstate-celebrations-earned";

function loadEarned(): Set<string> {
  try {
    const raw = sessionStorage.getItem(EARNED_STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

function persistEarned(set: Set<string>): void {
  try {
    sessionStorage.setItem(EARNED_STORAGE_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface CelebrationEffectsProps {
  tasks: Task[];
  events: SSEEvent[];
}

export function CelebrationEffects({ tasks, events }: CelebrationEffectsProps) {
  const [state, dispatch] = useReducer(celebrationReducer, {
    badges: [],
    banner: null,
    screenShake: false,
  });

  const earned = useRef<Set<string>>(loadEarned());
  const prevResolvedCount = useRef(0);
  const prevEventsLen = useRef(0);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed initial resolved count from tasks to avoid re-firing on remount
  const initialized = useRef(false);
  // Only evaluate task-based achievements after seeing agent activity this session
  const hasSeenAgentActivity = useRef(false);
  useEffect(() => {
    if (!initialized.current && tasks.length > 0) {
      initialized.current = true;
      prevResolvedCount.current = tasks.filter(
        (t) => t.status === TASK_STATUSES.RESOLVED,
      ).length;
    }
  }, [tasks]);

  const showBanner = useCallback((text: string) => {
    dispatch({ type: "SHOW_BANNER", text });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(
      () => dispatch({ type: "HIDE_BANNER" }),
      4000,
    );
  }, []);

  const triggerShake = useCallback(() => {
    dispatch({ type: "SCREEN_SHAKE", active: true });
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(
      () => dispatch({ type: "SCREEN_SHAKE", active: false }),
      600,
    );
  }, []);

  const awardAchievement = useCallback(
    (id: string): boolean => {
      if (earned.current.has(id)) return false;
      earned.current.add(id);
      persistEarned(earned.current);
      dispatch({ type: "ADD_BADGE", id });
      const ach = ALL_ACHIEVEMENTS.find((a) => a.id === id);
      if (ach) showBanner(ach.description);
      return true;
    },
    [showBanner],
  );

  // ── Task-based celebrations ─────────────────────────────────────────────

  useEffect(() => {
    // Don't evaluate achievements until the pipeline has had agent activity this session.
    // This prevents badges from firing on page load when tasks from a previous run exist.
    if (!hasSeenAgentActivity.current) return;

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

    // First fix
    if (resolvedCount > 0 && prevResolvedCount.current === 0) {
      if (awardAchievement(ACHIEVEMENTS.FIRST_FIX.id)) {
        smallBurst();
      }
    }

    // All criticals cleared — side cannons + gold stars
    if (
      criticalOpen === 0 &&
      tasks.some((t) => t.severity === SEVERITIES.CRITICAL)
    ) {
      if (awardAchievement(ACHIEVEMENTS.ZERO_BUGS.id)) {
        sideCannons();
        goldStars();
      }
    }

    // All tasks resolved — full fireworks
    if (tasks.length > 0 && openCount === 0) {
      if (awardAchievement(ACHIEVEMENTS.CLEAN_SWEEP.id)) {
        fireworks(5000);
      }
    }

    prevResolvedCount.current = resolvedCount;
  }, [tasks, awardAchievement]);

  // ── Event-based celebrations ────────────────────────────────────────────

  useEffect(() => {
    // When events array shrinks (e.g. after SSE acknowledge/flush), reset cursor
    if (events.length < prevEventsLen.current) {
      prevEventsLen.current = 0;
    }
    if (events.length <= prevEventsLen.current) return;
    const newEvents = events.slice(prevEventsLen.current);
    prevEventsLen.current = events.length;

    for (const evt of newEvents) {
      // Track agent activity so task-based celebrations only fire during active runs
      if (evt.type === SESSION_EVENT_TYPES.AGENT_END) {
        hasSeenAgentActivity.current = true;
      }

      // Pipeline converged — only celebrate if we ran at least one full cycle
      if (
        evt.type === SESSION_EVENT_TYPES.PIPELINE_STATE_CHANGE
      ) {
        const evtState = evt.data.state as PipelineState | undefined;
        if (
          evtState?.status === PIPELINE_STATUSES.STOPPED &&
          evtState.currentCycle > 0 &&
          evtState.tasksSummary.total > 0 &&
          evtState.tasksSummary.open === 0
        ) {
          if (awardAchievement(ACHIEVEMENTS.CONVERGED.id)) {
            fireworks(4000);
            showBanner("Pipeline converged — mission complete!");
          }
        }
      }

      // Build success — small green burst
      if (
        evt.type === SESSION_EVENT_TYPES.TOOL_EXECUTION_COMPLETE &&
        evt.data.toolName === "run_build" &&
        evt.data.success === true
      ) {
        // canvas-confetti requires raw hex values
        smallBurst({ x: 0.85, y: 0.5 }, ["#00FFA3", "#00C853", "#4ADE80"]);
      }

      // Build failure — screen shake + red glow
      if (
        evt.type === SESSION_EVENT_TYPES.TOOL_EXECUTION_COMPLETE &&
        evt.data.toolName === "run_build" &&
        evt.data.success === false
      ) {
        triggerShake();
      }

      // New cycle start — brief banner
      if (evt.type === SESSION_EVENT_TYPES.PIPELINE_CYCLE_START) {
        const cycle = (evt.data.cycle as number) ?? 0;
        if (cycle > 1) {
          showBanner(`Cycle ${cycle} starting`);
        }
      }
    }
  }, [events, awardAchievement, showBanner, triggerShake]);

  useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    };
  }, []);

  return (
    <>
      {/* Screen shake overlay — wraps nothing visually but applies CSS shake */}
      <AnimatePresence>
        {state.screenShake && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[1000]"
            initial={{ x: 0 }}
            animate={{
              x: [0, -8, 8, -6, 6, -3, 3, 0],
              y: [0, -2, 2, -1, 1, 0],
            }}
            exit={{ x: 0, y: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            style={{
              boxShadow: "inset 0 0 60px rgba(239, 68, 68, 0.15)",
              borderRadius: "inherit",
            }}
          />
        )}
      </AnimatePresence>

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
              className="rounded-2xl border border-white/[0.08] px-6 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl bg-surface/85"
              style={{
                boxShadow:
                  "0 0 20px rgba(0, 229, 255, 0.15), 0 8px 32px rgba(0,0,0,0.4)",
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
                className="flex items-center gap-2 rounded-full border border-white/[0.08] px-3.5 py-1.5 shadow-lg backdrop-blur-xl bg-surface/80"
                style={{
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
