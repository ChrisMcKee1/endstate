"use client";

import { memo } from "react";
import type { Severity, TaskStatus, AgentRole } from "@/lib/types";
import { SEVERITIES, TASK_STATUSES } from "@/lib/types";
import { AGENT_VISUALS } from "@/lib/agent-visuals";

// ─── Types ───────────────────────────────────────────────────────────────────

const BADGE_VARIANTS = {
  SEVERITY: "severity",
  STATUS: "status",
  AGENT: "agent",
  INFO: "info",
} as const;
type BadgeVariant = (typeof BADGE_VARIANTS)[keyof typeof BADGE_VARIANTS];

const BADGE_SIZES = {
  XS: "xs",
  SM: "sm",
} as const;
type BadgeSize = (typeof BADGE_SIZES)[keyof typeof BADGE_SIZES];

interface BadgeProps {
  /** Visual style category */
  variant: BadgeVariant;
  /** Display text — for "severity" pass the Severity value, for "agent" pass the AgentRole, etc. */
  value: string;
  /** Badge size: xs (9px) or sm (10px, default) */
  size?: BadgeSize;
  /** Additional classes */
  className?: string;
  /** ARIA role — defaults to "status" for screen readers. Set to "presentation" for decorative badges. */
  role?: string;
}

// ─── Severity color map ──────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<Severity, { text: string; bg: string }> = {
  [SEVERITIES.CRITICAL]: { text: "text-severity-critical", bg: "bg-severity-critical/15" },
  [SEVERITIES.HIGH]: { text: "text-severity-high", bg: "bg-severity-high/15" },
  [SEVERITIES.MEDIUM]: { text: "text-severity-medium", bg: "bg-severity-medium/15" },
  [SEVERITIES.LOW]: { text: "text-severity-low", bg: "bg-severity-low/15" },
};

// ─── Status color map ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<TaskStatus, { text: string; bg: string }> = {
  [TASK_STATUSES.OPEN]: { text: "text-accent", bg: "bg-accent/10" },
  [TASK_STATUSES.IN_PROGRESS]: { text: "text-status-paused", bg: "bg-status-paused/10" },
  [TASK_STATUSES.BLOCKED]: { text: "text-severity-high", bg: "bg-severity-high/10" },
  [TASK_STATUSES.RESOLVED]: { text: "text-status-live", bg: "bg-status-live/10" },
  [TASK_STATUSES.DEFERRED]: { text: "text-text-muted", bg: "bg-white/[0.03]" },
  [TASK_STATUSES.WONT_FIX]: { text: "text-text-muted", bg: "bg-white/[0.03]" },
};

// ─── Info (neutral) ──────────────────────────────────────────────────────────

const INFO_STYLE = { text: "text-text-secondary", bg: "bg-white/[0.04]" };

// ─── Size classes ────────────────────────────────────────────────────────────

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: "text-[9px] px-1.5 py-0.5",
  sm: "text-[10px] px-2 py-0.5",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAgentColors(role: string): { text: string; bg: string } {
  const vis = AGENT_VISUALS[role as AgentRole];
  if (vis) return { text: vis.text, bg: vis.bgBadge };
  return INFO_STYLE;
}

function resolveColors(variant: BadgeVariant, value: string): { text: string; bg: string } {
  switch (variant) {
    case BADGE_VARIANTS.SEVERITY:
      return SEVERITY_COLORS[value as Severity] ?? INFO_STYLE;
    case BADGE_VARIANTS.STATUS:
      return STATUS_COLORS[value as TaskStatus] ?? INFO_STYLE;
    case BADGE_VARIANTS.AGENT:
      return getAgentColors(value);
    case BADGE_VARIANTS.INFO:
    default:
      return INFO_STYLE;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export const Badge = memo(function Badge({
  variant,
  value,
  size = "sm",
  className = "",
  role = "status",
}: BadgeProps) {
  const colours = resolveColors(variant, value);

  return (
    <span
      role={role}
      className={[
        "inline-flex shrink-0 items-center rounded-full font-bold uppercase tracking-wider",
        SIZE_CLASSES[size],
        colours.bg,
        colours.text,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {value}
    </span>
  );
});

// ─── Re-export constants for consumers ───────────────────────────────────────

export { BADGE_VARIANTS, BADGE_SIZES };
export type { BadgeVariant, BadgeSize };
