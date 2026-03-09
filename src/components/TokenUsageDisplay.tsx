"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import type { AgentRole } from "@/lib/types";
import { AGENT_ROLES } from "@/lib/types";
import { getAgentVisual, hexToRgb } from "@/lib/agent-visuals";

// ─── Agent display helpers ───────────────────────────────────────────────────

function getTokenMeta(role: string) {
  const v = getAgentVisual(role);
  return {
    label: v.tag,
    color: v.hex,
    glow: `rgba(${hexToRgb(v.hex)}, 0.45)`,
    gradient: `linear-gradient(90deg, ${v.hex} 0%, ${v.gradientEnd} 100%)`,
  };
}

const AGENT_ORDER: string[] = [
  AGENT_ROLES.RESEARCHER,
  AGENT_ROLES.EXPLORER,
  AGENT_ROLES.ANALYST,
  AGENT_ROLES.ANALYST_UI,
  AGENT_ROLES.ANALYST_BACKEND,
  AGENT_ROLES.ANALYST_DATABASE,
  AGENT_ROLES.ANALYST_DOCS,
  AGENT_ROLES.FIXER,
  AGENT_ROLES.FIXER_UI,
  AGENT_ROLES.FIXER_BACKEND,
  AGENT_ROLES.FIXER_DATABASE,
  AGENT_ROLES.FIXER_DOCS,
  AGENT_ROLES.CONSOLIDATOR,
  AGENT_ROLES.UX_REVIEWER,
  AGENT_ROLES.CODE_SIMPLIFIER,
];

// ─── Full metrics shape ──────────────────────────────────────────────────────

interface FullMetrics {
  agentInputTokens?: Record<string, number>;
  agentOutputTokens?: Record<string, number>;
  agentTurns?: Record<string, number>;
  toolInvocations?: Record<string, number>;
  buildsPass?: number;
  buildsFail?: number;
  cyclesCompleted?: number;
  compactions?: number;
  contextUsage?: number;
  tasksCreated?: number;
  tasksResolved?: number;
  uxScores?: Record<string, number>;
  modelMaxContextTokens?: number;
}

// ─── Format helpers ──────────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Animated number with spring physics ─────────────────────────────────────

function SpringNumber({
  value,
  color,
  className = "font-mono text-xs font-bold tabular-nums",
}: {
  value: number;
  color: string;
  className?: string;
}) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 18 });
  const display = useTransform(spring, (v) => formatTokens(Math.round(v)));
  const [text, setText] = useState(formatTokens(0));

  useEffect(() => {
    motionVal.set(value);
  }, [value, motionVal]);

  useEffect(() => {
    return display.on("change", (v) => setText(v));
  }, [display]);

  return (
    <span className={className} style={{ color }}>
      {text}
    </span>
  );
}

function SpringInt({
  value,
  color,
  className = "font-mono text-sm font-bold tabular-nums",
}: {
  value: number;
  color: string;
  className?: string;
}) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 100, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    motionVal.set(value);
  }, [value, motionVal]);

  useEffect(() => {
    return spring.on("change", (v: number) => setDisplay(Math.round(v)));
  }, [spring]);

  return (
    <span className={className} style={{ color }}>
      {display}
    </span>
  );
}

// ─── Single Agent Bar ────────────────────────────────────────────────────────

interface AgentBarProps {
  role: string;
  inputTokens: number;
  outputTokens: number;
  maxTokens: number;
  isActive: boolean;
  prevTotal: number;
  isCompacting: boolean;
}

function AgentBar({
  role,
  inputTokens,
  outputTokens,
  maxTokens,
  isActive,
  prevTotal,
  isCompacting,
}: AgentBarProps) {
  const meta = getTokenMeta(role);

  const total = inputTokens + outputTokens;
  const inputPct = maxTokens > 0 ? (inputTokens / maxTokens) * 100 : 0;
  const outputPct = maxTokens > 0 ? (outputTokens / maxTokens) * 100 : 0;
  const isGrowing = total > prevTotal;

  return (
    <div className="flex flex-1 flex-col gap-1.5 min-w-0">
      {/* Label row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <motion.div
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: meta.color }}
            animate={
              isActive
                ? {
                    scale: [1, 1.6, 1],
                    boxShadow: [
                      `0 0 0px ${meta.glow}`,
                      `0 0 12px ${meta.glow}`,
                      `0 0 0px ${meta.glow}`,
                    ],
                  }
                : { scale: 1, boxShadow: `0 0 0px ${meta.glow}` }
            }
            transition={
              isActive
                ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.3 }
            }
          />
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: isActive ? meta.color : "var(--color-text-muted)" }}
          >
            {meta.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[8px] text-text-muted/50 hidden sm:inline">
            {total > 0
              ? `${formatTokens(inputTokens)} in · ${formatTokens(outputTokens)} out`
              : ""}
          </span>
          <SpringNumber value={total} color={total > 0 ? meta.color : "var(--color-text-muted)"} />
        </div>
      </div>

      {/* Bar track */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/[0.03]">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 5px)",
          }}
        />

        {/* Input segment */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: meta.gradient, opacity: 0.9 }}
          initial={{ width: 0 }}
          animate={{ width: `${inputPct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />

        {/* Output segment */}
        <motion.div
          className="absolute inset-y-0 rounded-full"
          style={{
            left: `${inputPct}%`,
            background: meta.gradient,
            opacity: 0.5,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${outputPct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />

        {/* Throbbing glow overlay when actively growing */}
        <AnimatePresence>
          {isGrowing && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${meta.color}20 50%, transparent 100%)`,
                backgroundSize: "200% 100%",
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.6, 0],
                backgroundPosition: ["-100% 0%", "200% 0%"],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
        </AnimatePresence>

        {/* Compaction: dramatic scan line when context is being compressed */}
        <AnimatePresence>
          {isCompacting && isActive && (
            <motion.div
              className="absolute inset-y-0 w-full rounded-full"
              style={{
                background: `linear-gradient(90deg, transparent 0%, rgba(0, 229, 255, 0.4) 50%, transparent 100%)`,
                backgroundSize: "40% 100%",
              }}
              initial={{ backgroundPosition: "-40% 0%", opacity: 0 }}
              animate={{
                backgroundPosition: ["0% 0%", "140% 0%"],
                opacity: [0, 1, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
        </AnimatePresence>

        {/* Active agent: pulsing edge glow */}
        {isActive && total > 0 && (
          <motion.div
            className="absolute inset-y-0 w-1 rounded-full"
            style={{
              left: `${Math.min(inputPct + outputPct, 100)}%`,
              background: meta.color,
              boxShadow: `0 0 8px ${meta.glow}, 0 0 20px ${meta.glow}`,
            }}
            animate={{
              opacity: [0.4, 1, 0.4],
              scaleY: [0.7, 1.1, 0.7],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Stat Pill — small animated metric chip ──────────────────────────────────

function StatPill({
  icon,
  label,
  value,
  color,
  glowColor,
  prevValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  glowColor: string;
  prevValue: number;
}) {
  const isGrowing = value > prevValue;

  return (
    <motion.div
      className="relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 min-w-[72px]"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
      animate={
        isGrowing
          ? {
              boxShadow: [
                `0 0 0px ${glowColor}`,
                `0 0 16px ${glowColor}`,
                `0 0 0px ${glowColor}`,
              ],
            }
          : { boxShadow: `0 0 0px ${glowColor}` }
      }
      transition={
        isGrowing
          ? { duration: 1.5, repeat: 2, ease: "easeInOut" }
          : { duration: 0.3 }
      }
    >
      {/* Growth flash */}
      <AnimatePresence>
        {isGrowing && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{ background: glowColor }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1">
        <span style={{ color }} className="text-[10px]">
          {icon}
        </span>
        <SpringInt
          value={value}
          color={color}
          className="font-mono text-base font-bold tabular-nums"
        />
      </div>
      <span className="text-[8px] uppercase tracking-[0.15em] text-text-muted whitespace-nowrap">
        {label}
      </span>
    </motion.div>
  );
}

// ─── Build Streak Bar ────────────────────────────────────────────────────────

function BuildStreakBar({
  pass,
  fail,
  prevPass,
}: {
  pass: number;
  fail: number;
  prevPass: number;
}) {
  const total = pass + fail;
  const rate = total > 0 ? (pass / total) * 100 : 0;
  const isNewPass = pass > prevPass;

  const barColor =
    rate >= 80
      ? "#00FFA3"
      : rate >= 50
        ? "#FFB800"
        : rate > 0
          ? "#EF4444"
          : "rgba(255,255,255,0.1)";

  const barGlow =
    rate >= 80
      ? "rgba(0, 255, 163, 0.3)"
      : rate >= 50
        ? "rgba(255, 184, 0, 0.3)"
        : "rgba(239, 68, 68, 0.3)";

  return (
    <div className="flex flex-col gap-1 min-w-[100px]">
      <div className="flex items-center justify-between">
        <span className="text-[8px] uppercase tracking-[0.15em] text-text-muted">
          Builds
        </span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5 text-[9px]">
            <span className="text-status-live">✓</span>
            <SpringInt
              value={pass}
              color="#00FFA3"
              className="font-mono text-[10px] font-bold tabular-nums"
            />
          </span>
          <span className="flex items-center gap-0.5 text-[9px]">
            <span className="text-severity-critical">✗</span>
            <SpringInt
              value={fail}
              color="#EF4444"
              className="font-mono text-[10px] font-bold tabular-nums"
            />
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.03]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: barColor,
            boxShadow: total > 0 ? `0 0 8px ${barGlow}` : "none",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 18 }}
        />

        {/* New build pass celebration sweep */}
        <AnimatePresence>
          {isNewPass && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(0, 255, 163, 0.4), transparent)",
                backgroundSize: "50% 100%",
              }}
              initial={{ backgroundPosition: "-50% 0%", opacity: 0 }}
              animate={{
                backgroundPosition: ["0% 0%", "150% 0%"],
                opacity: [0, 1, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Percentage */}
      <div className="flex justify-end">
        <motion.span
          className="font-mono text-[10px] font-bold tabular-nums"
          style={{ color: barColor }}
          animate={
            rate === 100 && total > 0
              ? { scale: [1, 1.15, 1], textShadow: [`0 0 0px ${barGlow}`, `0 0 8px ${barGlow}`, `0 0 0px ${barGlow}`] }
              : {}
          }
          transition={
            rate === 100 && total > 0
              ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
              : {}
          }
        >
          {total > 0 ? `${rate.toFixed(0)}%` : "—"}
        </motion.span>
      </div>
    </div>
  );
}

// ─── Compaction Indicator ────────────────────────────────────────────────────

function CompactionIndicator({
  count,
  isCompacting,
}: {
  count: number;
  isCompacting: boolean;
}) {
  return (
    <motion.div
      className="relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 min-w-[60px]"
      style={{
        background: isCompacting ? "rgba(0, 229, 255, 0.05)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isCompacting ? "rgba(0, 229, 255, 0.2)" : "rgba(255,255,255,0.05)"}`,
      }}
      animate={
        isCompacting
          ? {
              boxShadow: [
                "0 0 0px rgba(0, 229, 255, 0)",
                "0 0 20px rgba(0, 229, 255, 0.3)",
                "0 0 0px rgba(0, 229, 255, 0)",
              ],
            }
          : {}
      }
      transition={
        isCompacting
          ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
          : {}
      }
    >
      {/* Compaction flash overlay */}
      <AnimatePresence>
        {isCompacting && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.3, 0],
              background: [
                "radial-gradient(circle, rgba(0,229,255,0) 0%, rgba(0,229,255,0) 100%)",
                "radial-gradient(circle, rgba(0,229,255,0.2) 0%, rgba(0,229,255,0) 70%)",
                "radial-gradient(circle, rgba(0,229,255,0) 0%, rgba(0,229,255,0) 100%)",
              ],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1">
        {/* Zap icon */}
        <motion.svg
          className="h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isCompacting ? "#00E5FF" : "#90A4AE"}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={isCompacting ? { rotate: [0, -10, 10, 0] } : {}}
          transition={isCompacting ? { duration: 0.5, repeat: Infinity } : {}}
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </motion.svg>
        <SpringInt
          value={count}
          color={isCompacting ? "#00E5FF" : "#90A4AE"}
          className="font-mono text-base font-bold tabular-nums"
        />
      </div>
      <span className="text-[8px] uppercase tracking-[0.15em] text-text-muted whitespace-nowrap">
        {isCompacting ? "Compacting…" : "Compactions"}
      </span>
    </motion.div>
  );
}

// ─── Agent Leaderboard mini ──────────────────────────────────────────────────

function AgentLeaderboard({ turns }: { turns: Record<string, number> }) {
  const sorted = useMemo(() => {
    return AGENT_ORDER
      .map((role) => ({ role, turns: turns[role] ?? 0 }))
      .filter((s) => s.turns > 0)
      .sort((a, b) => b.turns - a.turns);
  }, [turns]);

  const maxTurns = Math.max(...sorted.map((s) => s.turns), 1);

  if (sorted.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 min-w-[80px]">
      <span className="text-[8px] uppercase tracking-[0.15em] text-text-muted text-center mb-0.5">
        Agent Turns
      </span>
      {sorted.map(({ role, turns: t }, i) => {
        const meta = getTokenMeta(role);
        const pct = maxTurns > 0 ? (t / maxTurns) * 100 : 0;

        return (
          <div key={role} className="flex items-center gap-1.5">
            {/* Rank medal for top agent */}
            <span className="text-[9px] w-3 text-center shrink-0">
              {i === 0 && t > 0 ? "👑" : ""}
            </span>
            <div
              className="h-1 rounded-full flex-1 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: meta.color, opacity: 0.7 }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
            <span
              className="font-mono text-[9px] font-bold tabular-nums w-5 text-right shrink-0"
              style={{ color: meta.color }}
            >
              {t}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface TokenUsageDisplayProps {
  activeAgent: AgentRole | null;
  isCompacting: boolean;
}

export function TokenUsageDisplay({
  activeAgent,
  isCompacting,
}: TokenUsageDisplayProps) {
  const [metrics, setMetrics] = useState<FullMetrics>({});
  const [prevTotals, setPrevTotals] = useState<Record<string, number>>({});
  const [prevMetrics, setPrevMetrics] = useState<{
    buildsPass: number;
    buildsFail: number;
    toolCalls: number;
    tasksResolved: number;
    compactions: number;
  }>({ buildsPass: 0, buildsFail: 0, toolCalls: 0, tasksResolved: 0, compactions: 0 });

  // Track compaction flash timing — show a dramatic flash when compaction just ended
  const [justCompacted, setJustCompacted] = useState(false);
  const compactTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCompacting = useRef(false);

  useEffect(() => {
    // Detect transition from compacting → not compacting
    if (prevCompacting.current && !isCompacting) {
      setJustCompacted(true);
      compactTimerRef.current = setTimeout(() => setJustCompacted(false), 2000);
    }
    prevCompacting.current = isCompacting;
    return () => {
      if (compactTimerRef.current) clearTimeout(compactTimerRef.current);
    };
  }, [isCompacting]);

  // Poll metrics — 3s for responsive updates
  useEffect(() => {
    const fetchMetrics = () => {
      fetch("/api/metrics")
        .then((r) => r.json())
        .then((data: { metrics?: FullMetrics }) => {
          if (data.metrics) {
            setMetrics((prev) => {
              // Snapshot previous token totals for growth detection
              const inp = prev.agentInputTokens ?? {};
              const out = prev.agentOutputTokens ?? {};
              const totals: Record<string, number> = {};
              for (const role of AGENT_ORDER) {
                totals[role] = (inp[role] ?? 0) + (out[role] ?? 0);
              }
              setPrevTotals(totals);

              // Snapshot previous stat values for growth flash
              const prevToolCalls = prev.toolInvocations
                ? Object.values(prev.toolInvocations).reduce((s, v) => s + v, 0)
                : 0;
              setPrevMetrics({
                buildsPass: prev.buildsPass ?? 0,
                buildsFail: prev.buildsFail ?? 0,
                toolCalls: prevToolCalls,
                tasksResolved: prev.tasksResolved ?? 0,
                compactions: prev.compactions ?? 0,
              });

              return data.metrics!;
            });
          }
        })
        .catch(() => {});
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3_000);
    return () => clearInterval(interval);
  }, []);

  const totalTokens = useMemo(() => {
    const inp = metrics.agentInputTokens ?? {};
    const out = metrics.agentOutputTokens ?? {};
    const allRoles = new Set([...Object.keys(inp), ...Object.keys(out)]);
    let sum = 0;
    for (const r of allRoles) sum += (inp[r] ?? 0) + (out[r] ?? 0);
    return sum;
  }, [metrics.agentInputTokens, metrics.agentOutputTokens]);

  // Scale bars against the model's actual context window from SDK metadata.
  // Falls back to 200K if the model lookup hasn't resolved yet.
  const modelMax = metrics.modelMaxContextTokens ?? 0;
  const agentMax = useMemo(() => {
    if (modelMax > 0) return modelMax;
    // Fallback: use relative scale with a reasonable floor
    const inp = metrics.agentInputTokens ?? {};
    const out = metrics.agentOutputTokens ?? {};
    let maxSingle = 0;
    for (const role of AGENT_ORDER) {
      const t = (inp[role] ?? 0) + (out[role] ?? 0);
      if (t > maxSingle) maxSingle = t;
    }
    return Math.max(maxSingle * 1.5, 200_000);
  }, [metrics.agentInputTokens, metrics.agentOutputTokens, modelMax]);

  const totalToolCalls = useMemo(() => {
    if (!metrics.toolInvocations) return 0;
    return Object.values(metrics.toolInvocations).reduce((s, v) => s + v, 0);
  }, [metrics.toolInvocations]);

  const hasAnyActivity =
    totalTokens > 0 ||
    (metrics.buildsPass ?? 0) + (metrics.buildsFail ?? 0) > 0 ||
    totalToolCalls > 0;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="glass-panel relative shrink-0 border-t-0 overflow-hidden"
    >
      {/* Ambient background gradient */}
      {hasAnyActivity && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,229,255,0.02) 0%, rgba(176,38,255,0.02) 33%, rgba(0,255,163,0.02) 66%, rgba(255,184,0,0.02) 100%)",
          }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Compaction flash — dramatic white-out sweep across entire strip */}
      <AnimatePresence>
        {justCompacted && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-20"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.15), rgba(255, 255, 255, 0.08), rgba(0, 229, 255, 0.15), transparent)",
              backgroundSize: "40% 100%",
            }}
            initial={{ backgroundPosition: "-40% 0%", opacity: 0 }}
            animate={{
              backgroundPosition: ["-40% 0%", "140% 0%"],
              opacity: [0, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      <div className="relative flex items-center gap-4 px-4 py-2.5">
        {/* ── Token Section ── */}
        <div className="flex items-center gap-4 flex-1 min-w-0 overflow-hidden">
          {/* Agent bars — only show agents with activity */}
          <div className="flex flex-1 items-stretch gap-3 min-w-0 overflow-x-auto">
            {AGENT_ORDER.filter((role) => {
              const inp = metrics.agentInputTokens?.[role] ?? 0;
              const out = metrics.agentOutputTokens?.[role] ?? 0;
              return inp + out > 0 || activeAgent === role;
            }).map((role) => (
              <AgentBar
                key={role}
                role={role}
                inputTokens={metrics.agentInputTokens?.[role] ?? 0}
                outputTokens={metrics.agentOutputTokens?.[role] ?? 0}
                maxTokens={agentMax}
                isActive={activeAgent === role}
                prevTotal={prevTotals[role] ?? 0}
                isCompacting={isCompacting}
              />
            ))}
            {/* Empty state when no agents have activity */}
            {!hasAnyActivity && (
              <div className="flex items-center gap-2 py-1 text-text-muted/50">
                <span className="text-[10px] uppercase tracking-widest">No agent activity yet</span>
              </div>
            )}
          </div>

          {/* Total tokens badge */}
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <SpringNumber
              value={totalTokens}
              color={totalTokens > 0 ? "#00E5FF" : "var(--color-text-muted)"}
              className="font-mono text-sm font-bold tabular-nums"
            />
            <span className="text-[7px] uppercase tracking-[0.15em] text-text-muted">
              Tokens
            </span>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="h-10 w-px shrink-0 bg-white/[0.06]" />

        {/* ── Gamification Stats ── */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Build streak */}
          <BuildStreakBar
            pass={metrics.buildsPass ?? 0}
            fail={metrics.buildsFail ?? 0}
            prevPass={prevMetrics.buildsPass}
          />

          {/* Stat pills */}
          <StatPill
            icon={
              <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            }
            label="Tools"
            value={totalToolCalls}
            color="#B026FF"
            glowColor="rgba(176, 38, 255, 0.3)"
            prevValue={prevMetrics.toolCalls}
          />

          <StatPill
            icon={
              <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            }
            label="Resolved"
            value={metrics.tasksResolved ?? 0}
            color="#00FFA3"
            glowColor="rgba(0, 255, 163, 0.3)"
            prevValue={prevMetrics.tasksResolved}
          />

          {/* Compaction indicator */}
          <CompactionIndicator
            count={metrics.compactions ?? 0}
            isCompacting={isCompacting}
          />

          {/* Agent leaderboard */}
          <AgentLeaderboard turns={metrics.agentTurns ?? {}} />
        </div>
      </div>
    </motion.div>
  );
}
