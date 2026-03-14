"use client";

import { motion } from "framer-motion";

const RING_RADIUS = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const SPRING = { type: "spring" as const, stiffness: 200, damping: 22 };

function meterStroke(pct: number): string {
  if (pct < 50) return "var(--color-accent-emerald)";
  if (pct < 75) return "var(--color-severity-medium)";
  if (pct < 90) return "var(--color-severity-high)";
  return "var(--color-severity-critical)";
}

interface ContextMeterProps {
  usage: number; // 0-1
  isCompacting: boolean;
  tokenCount?: number;
  maxTokens?: number;
}

export function ContextMeter({ usage, isCompacting, tokenCount, maxTokens }: ContextMeterProps) {
  const pct = Math.round(usage * 100);
  const stroke = meterStroke(pct);
  const progress = (pct / 100) * RING_CIRCUMFERENCE;

  return (
    <div
      className="flex items-center gap-2"
      title={`Context: ${pct}%${isCompacting ? " (compacting…)" : ""}`}
    >
      <div className="relative h-[40px] w-[40px]">
        <svg
          viewBox="0 0 40 40"
          className="h-full w-full -rotate-90"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Context window usage: ${pct}%${isCompacting ? ' (compacting)' : ''}`}
        >
          {/* Background ring */}
          <circle
            cx={20}
            cy={20}
            r={RING_RADIUS}
            fill="none"
            stroke="var(--color-border-subtle)"
            strokeWidth={3}
          />
          {/* Progress ring */}
          <motion.circle
            cx={20}
            cy={20}
            r={RING_RADIUS}
            fill="none"
            stroke={stroke}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
            animate={{ strokeDashoffset: RING_CIRCUMFERENCE - progress }}
            transition={SPRING}
          />
          {/* Compaction pulse ring */}
          {isCompacting && (
            <motion.circle
              cx={20}
              cy={20}
              r={RING_RADIUS}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE - progress}
              animate={{ opacity: [0.1, 0.4, 0.1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </svg>
        {/* Center percentage */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-mono text-[9px] font-bold"
            style={{ color: stroke }}
          >
            {pct}
          </span>
        </div>
      </div>

      {/* Info column */}
      <div className="flex flex-col">
        <span className="text-[9px] font-medium uppercase tracking-widest text-text-muted">
          CTX
        </span>
        {tokenCount != null && maxTokens != null && (
          <span className="font-mono text-[8px] text-text-muted/60">
            {(tokenCount / 1000).toFixed(0)}k / {(maxTokens / 1000).toFixed(0)}k
          </span>
        )}
        {isCompacting && (
          <motion.span
            className="text-[8px] font-medium text-accent"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            Compacting
          </motion.span>
        )}
      </div>
    </div>
  );
}
