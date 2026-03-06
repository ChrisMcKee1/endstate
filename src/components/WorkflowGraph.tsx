"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { AgentRole, PipelineStatus } from "@/lib/types";
import { AGENT_ROLES, PIPELINE_STATUSES } from "@/lib/types";

// ─── Node configuration ─────────────────────────────────────────────────────

const NODES = [
  {
    role: AGENT_ROLES.EXPLORER,
    label: "Explorer",
    x: 120,
    color: "#00E5FF",
    icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z",
  },
  {
    role: AGENT_ROLES.ANALYST,
    label: "Analyst",
    x: 320,
    color: "#B026FF",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  },
  {
    role: AGENT_ROLES.FIXER,
    label: "Fixer",
    x: 520,
    color: "#00FFA3",
    icon: "M11.42 15.17l-5.1-5.1m0 0L11.42 4.96m-5.1 5.11h13.86",
  },
  {
    role: AGENT_ROLES.UX_REVIEWER,
    label: "UX Review",
    x: 720,
    color: "#FFB800",
    icon: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
] as const;

const NODE_RADIUS = 24;
const SVG_WIDTH = 860;
const SVG_HEIGHT = 90;
const NODE_Y = 44;

const BREATHE_TRANSITION = {
  duration: 2,
  repeat: Infinity,
  repeatType: "reverse" as const,
  ease: "easeInOut" as const,
};

const SPRING = { type: "spring" as const, stiffness: 200, damping: 20 };

// ─── Component ───────────────────────────────────────────────────────────────

interface WorkflowGraphProps {
  activeAgent: AgentRole | null;
  cycle: number;
  status: PipelineStatus;
  completedAgents?: AgentRole[];
}

export function WorkflowGraph({
  activeAgent,
  cycle,
  status,
  completedAgents = [],
}: WorkflowGraphProps) {
  const isRunning = status === PIPELINE_STATUSES.RUNNING;
  const completedSet = new Set(completedAgents);

  return (
    <div
      className="flex items-center justify-center px-4 py-3 backdrop-blur-sm"
      style={{ background: "rgba(20, 21, 31, 0.4)" }}
    >
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="h-[80px] w-full max-w-[860px]"
        aria-label="Agent pipeline workflow"
      >
        <defs>
          {NODES.map((node) => (
            <filter key={`glow-${node.role}`} id={`glow-${node.role}`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor={node.color} floodOpacity="0.4" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}

          {NODES.slice(0, -1).map((from, i) => {
            const to = NODES[i + 1];
            return (
              <linearGradient key={`eg-${i}`} id={`eg-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={from.color} stopOpacity="0.5" />
                <stop offset="100%" stopColor={to.color} stopOpacity="0.5" />
              </linearGradient>
            );
          })}

          <linearGradient id="loop-grad" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#FFB800" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#B026FF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* ── Edges ──────────────────────────────────────────────── */}
        {NODES.slice(0, -1).map((from, i) => {
          const to = NODES[i + 1];
          const isActive = isRunning && (activeAgent === from.role || activeAgent === to.role);

          return (
            <g key={`edge-${i}`}>
              <line
                x1={from.x + NODE_RADIUS + 6}
                y1={NODE_Y}
                x2={to.x - NODE_RADIUS - 6}
                y2={NODE_Y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={1}
              />
              <motion.line
                x1={from.x + NODE_RADIUS + 6}
                y1={NODE_Y}
                x2={to.x - NODE_RADIUS - 6}
                y2={NODE_Y}
                stroke={isActive ? `url(#eg-${i})` : "rgba(255,255,255,0.08)"}
                strokeWidth={isActive ? 2 : 1}
                strokeDasharray={isActive ? "8 5" : "none"}
                strokeLinecap="round"
                initial={false}
                animate={{
                  strokeDashoffset: isActive ? [-26, 0] : 0,
                  strokeOpacity: isActive ? 0.9 : 0.2,
                }}
                transition={
                  isActive
                    ? { strokeDashoffset: { duration: 1, repeat: Infinity, ease: "linear" }, strokeOpacity: { duration: 0.3 } }
                    : { duration: 0.3 }
                }
                style={isActive ? { willChange: "stroke-dashoffset" } : undefined}
              />
            </g>
          );
        })}

        {/* ── Loop-back arc ──────────────────────────────────────── */}
        <motion.path
          d={`M ${NODES[3].x + NODE_RADIUS + 8} ${NODE_Y - 10}
              C ${NODES[3].x + 70} ${NODE_Y - 56},
                ${NODES[0].x - 70} ${NODE_Y - 56},
                ${NODES[0].x - NODE_RADIUS - 8} ${NODE_Y - 10}`}
          fill="none"
          stroke="url(#loop-grad)"
          strokeWidth={1.5}
          strokeDasharray="6 8"
          strokeLinecap="round"
          initial={false}
          animate={{
            strokeDashoffset: isRunning ? [-28, 0] : 0,
            strokeOpacity: isRunning ? 0.5 : 0.15,
          }}
          transition={
            isRunning
              ? { strokeDashoffset: { duration: 2, repeat: Infinity, ease: "linear" }, strokeOpacity: { duration: 0.5 } }
              : { duration: 0.5 }
          }
          style={isRunning ? { willChange: "stroke-dashoffset" } : undefined}
        />

        {/* ── Cycle badge ────────────────────────────────────────── */}
        <AnimatePresence>
          {cycle > 0 && (
            <motion.g
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={SPRING}
            >
              <rect
                x={SVG_WIDTH / 2 - 20}
                y={1}
                width={40}
                height={18}
                rx={9}
                fill="rgba(20, 21, 31, 0.8)"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={0.5}
              />
              <text
                x={SVG_WIDTH / 2}
                y={13}
                textAnchor="middle"
                fill="#94A3B8"
                fontSize={9}
                fontFamily="var(--font-code)"
              >
                ×{cycle}
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Nodes ──────────────────────────────────────────────── */}
        {NODES.map((node) => {
          const isCurrent = activeAgent === node.role && isRunning;
          const isCompleted = completedSet.has(node.role);

          return (
            <g key={node.role}>
              {/* Breathing glow ring */}
              <AnimatePresence>
                {isCurrent && (
                  <motion.circle
                    cx={node.x}
                    cy={NODE_Y}
                    r={NODE_RADIUS + 8}
                    fill="none"
                    stroke={node.color}
                    strokeWidth={1.5}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.6, 0.3] }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={BREATHE_TRANSITION}
                    style={{ transformOrigin: `${node.x}px ${NODE_Y}px` }}
                  />
                )}
              </AnimatePresence>

              {/* Glass backdrop */}
              <circle
                cx={node.x}
                cy={NODE_Y}
                r={NODE_RADIUS}
                fill={isCurrent ? node.color : "rgba(20, 21, 31, 0.6)"}
                fillOpacity={isCurrent ? 0.15 : 1}
                stroke={isCompleted ? node.color : "rgba(255,255,255,0.06)"}
                strokeWidth={isCurrent ? 2 : isCompleted ? 1.5 : 0.5}
              />

              {/* Agent color fill at 15% */}
              <circle
                cx={node.x}
                cy={NODE_Y}
                r={NODE_RADIUS}
                fill={node.color}
                fillOpacity={isCurrent ? 0.15 : isCompleted ? 0.1 : 0.03}
                filter={isCurrent ? `url(#glow-${node.role})` : undefined}
              />

              {/* Inner edge ring */}
              <circle
                cx={node.x}
                cy={NODE_Y}
                r={NODE_RADIUS - 1}
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={0.5}
              />

              {/* Completed check or icon */}
              {isCompleted && !isCurrent ? (
                <motion.g
                  transform={`translate(${node.x - 7}, ${NODE_Y - 7})`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={SPRING}
                >
                  <path
                    d="M2 7l4 4L14 3"
                    fill="none"
                    stroke={node.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.g>
              ) : (
                <g transform={`translate(${node.x - 8}, ${NODE_Y - 8}) scale(0.667)`}>
                  <path
                    d={node.icon}
                    fill="none"
                    stroke={isCurrent ? node.color : isCompleted ? node.color : "#475569"}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )}

              {/* Label */}
              <text
                x={node.x}
                y={NODE_Y + NODE_RADIUS + 15}
                textAnchor="middle"
                fill={isCurrent ? node.color : isCompleted ? "#94A3B8" : "#475569"}
                fontSize={9}
                fontFamily="var(--font-body)"
                letterSpacing="0.12em"
                fontWeight={isCurrent ? 700 : 500}
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
