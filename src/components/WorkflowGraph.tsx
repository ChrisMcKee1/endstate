"use client";

import type { AgentRole, PipelineStatus } from "@/lib/types";
import { AGENT_ROLES, PIPELINE_STATUSES } from "@/lib/types";

// ─── Node configuration ─────────────────────────────────────────────────────

const NODES = [
  {
    role: AGENT_ROLES.EXPLORER,
    label: "Explorer",
    x: 120,
    color: "var(--color-agent-explorer)",
    icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z",
  },
  {
    role: AGENT_ROLES.ANALYST,
    label: "Analyst",
    x: 320,
    color: "var(--color-agent-analyst)",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  },
  {
    role: AGENT_ROLES.FIXER,
    label: "Fixer",
    x: 520,
    color: "var(--color-agent-fixer)",
    icon: "M11.42 15.17l-5.1-5.1m0 0L11.42 4.96m-5.1 5.11h13.86",
  },
  {
    role: AGENT_ROLES.UX_REVIEWER,
    label: "UX Review",
    x: 720,
    color: "var(--color-agent-ux)",
    icon: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
] as const;

const NODE_RADIUS = 22;
const SVG_WIDTH = 860;
const SVG_HEIGHT = 80;
const NODE_Y = 40;

interface WorkflowGraphProps {
  activeAgent: AgentRole | null;
  cycle: number;
  status: PipelineStatus;
}

export function WorkflowGraph({
  activeAgent,
  cycle,
  status,
}: WorkflowGraphProps) {
  const isRunning = status === PIPELINE_STATUSES.RUNNING;

  return (
    <div className="flex items-center justify-center bg-surface/30 px-4 py-3">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="h-[72px] w-full max-w-[860px]"
        aria-label="Agent pipeline workflow"
      >
        <defs>
          {NODES.map((node) => (
            <filter key={`glow-${node.role}`} id={`glow-${node.role}`}>
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {/* ── Edges ──────────────────────────────────────────────────── */}
        {NODES.slice(0, -1).map((from, i) => {
          const to = NODES[i + 1];
          const isActive =
            isRunning &&
            (activeAgent === from.role || activeAgent === to.role);

          return (
            <line
              key={`edge-${i}`}
              x1={from.x + NODE_RADIUS + 4}
              y1={NODE_Y}
              x2={to.x - NODE_RADIUS - 4}
              y2={NODE_Y}
              stroke={isActive ? "var(--color-accent)" : "var(--color-border-active)"}
              strokeWidth={isActive ? 2 : 1}
              strokeDasharray={isActive ? "6 4" : "none"}
              className={isActive ? "animate-flow-dash" : ""}
              strokeOpacity={isActive ? 0.8 : 0.3}
            />
          );
        })}

        {/* ── Loop-back arc ──────────────────────────────────────────── */}
        <path
          d={`M ${NODES[3].x + NODE_RADIUS + 6} ${NODE_Y - 8}
              C ${NODES[3].x + 60} ${NODE_Y - 50},
                ${NODES[0].x - 60} ${NODE_Y - 50},
                ${NODES[0].x - NODE_RADIUS - 6} ${NODE_Y - 8}`}
          fill="none"
          stroke={
            isRunning && activeAgent === AGENT_ROLES.UX_REVIEWER
              ? "var(--color-accent)"
              : "var(--color-border-subtle)"
          }
          strokeWidth={1}
          strokeDasharray="4 6"
          strokeOpacity={0.25}
        />

        {/* ── Cycle badge on arc ─────────────────────────────────────── */}
        {cycle > 0 && (
          <>
            <rect
              x={SVG_WIDTH / 2 - 18}
              y={2}
              width={36}
              height={16}
              rx={8}
              fill="var(--color-elevated)"
              stroke="var(--color-border-active)"
              strokeWidth={0.5}
            />
            <text
              x={SVG_WIDTH / 2}
              y={13}
              textAnchor="middle"
              fill="var(--color-text-secondary)"
              fontSize={8}
              fontFamily="var(--font-code)"
            >
              ×{cycle}
            </text>
          </>
        )}

        {/* ── Nodes ──────────────────────────────────────────────────── */}
        {NODES.map((node) => {
          const isCurrent = activeAgent === node.role && isRunning;

          return (
            <g key={node.role}>
              {/* Active ring */}
              {isCurrent && (
                <circle
                  cx={node.x}
                  cy={NODE_Y}
                  r={NODE_RADIUS + 6}
                  fill="none"
                  stroke={node.color}
                  strokeWidth={1}
                  opacity={0.3}
                  className="animate-node-ring"
                />
              )}

              {/* Node circle */}
              <circle
                cx={node.x}
                cy={NODE_Y}
                r={NODE_RADIUS}
                fill={isCurrent ? node.color : "var(--color-elevated)"}
                fillOpacity={isCurrent ? 0.15 : 1}
                stroke={node.color}
                strokeWidth={isCurrent ? 2 : 1}
                strokeOpacity={isCurrent ? 1 : 0.3}
                filter={isCurrent ? `url(#glow-${node.role})` : undefined}
                className={isCurrent ? "animate-pulse-glow" : ""}
              />

              {/* Icon */}
              <g transform={`translate(${node.x - 8}, ${NODE_Y - 8}) scale(0.667)`}>
                <path
                  d={node.icon}
                  fill="none"
                  stroke={isCurrent ? node.color : "var(--color-text-muted)"}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>

              {/* Label */}
              <text
                x={node.x}
                y={NODE_Y + NODE_RADIUS + 14}
                textAnchor="middle"
                fill={isCurrent ? node.color : "var(--color-text-muted)"}
                fontSize={9}
                fontFamily="var(--font-display)"
                letterSpacing="0.1em"
                fontWeight={isCurrent ? 700 : 400}
              >
                {node.label.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
