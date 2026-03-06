"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentRole, PipelineStatus, AgentGraphNode } from "@/lib/types";
import { AGENT_ROLES, PIPELINE_STATUSES, GRAPH_NODE_TYPES, DEFAULT_AGENT_GRAPH } from "@/lib/types";

// ─── Agent visual config ────────────────────────────────────────────────────

const AGENT_VISUALS: Record<string, { label: string; color: string; icon: string }> = {
  [AGENT_ROLES.RESEARCHER]: {
    label: "Research",
    color: "#FF6B6B",
    icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  },
  [AGENT_ROLES.EXPLORER]: {
    label: "Explorer",
    color: "#00E5FF",
    icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z",
  },
  [AGENT_ROLES.ANALYST]: {
    label: "Analyst",
    color: "#B026FF",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  },
  [AGENT_ROLES.FIXER]: {
    label: "Fixer",
    color: "#00FFA3",
    icon: "M11.42 15.17l-5.1-5.1m0 0L11.42 4.96m-5.1 5.11h13.86",
  },
  [AGENT_ROLES.UX_REVIEWER]: {
    label: "UX Review",
    color: "#FFB800",
    icon: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z",
  },
  [AGENT_ROLES.CODE_SIMPLIFIER]: {
    label: "Simplify",
    color: "#FF69B4",
    icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
  },
};

const NODE_RADIUS = 22;
const SVG_HEIGHT = 110;
const NODE_CENTER_Y = 50;

const BREATHE_TRANSITION = {
  duration: 2,
  repeat: Infinity,
  repeatType: "reverse" as const,
  ease: "easeInOut" as const,
};

const SPRING = { type: "spring" as const, stiffness: 200, damping: 20 };

// ─── Layout computation ──────────────────────────────────────────────────────

interface LayoutNode {
  role: AgentRole;
  x: number;
  y: number;
  color: string;
  label: string;
  icon: string;
  nodeType: string;
  parallel: boolean;
}

function computeLayout(graph: AgentGraphNode[]): { nodes: LayoutNode[]; width: number } {
  if (graph.length === 0) return { nodes: [], width: 200 };

  // Group nodes into "layers" by topological depth
  const depth: Record<string, number> = {};
  const completed = new Set<string>();

  // BFS to compute depth for each node
  function computeDepth(role: string): number {
    if (depth[role] !== undefined) return depth[role];
    const node = graph.find((n) => n.role === role);
    if (!node || node.runAfter.length === 0) {
      depth[role] = 0;
      return 0;
    }
    const maxParent = Math.max(
      ...node.runAfter.map((dep) => computeDepth(dep)),
    );
    depth[role] = maxParent + 1;
    return depth[role];
  }

  for (const node of graph) computeDepth(node.role);

  // Group by depth
  const layers: AgentGraphNode[][] = [];
  for (const node of graph) {
    const d = depth[node.role] ?? 0;
    if (!layers[d]) layers[d] = [];
    layers[d].push(node);
  }

  // Compute x/y positions
  const PADDING_X = 70;
  const LAYER_SPACING = 150;
  const PARALLEL_SPACING = 50;
  const nodes: LayoutNode[] = [];
  let maxX = 0;

  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    if (!layer) continue;
    const x = PADDING_X + li * LAYER_SPACING;

    if (layer.length === 1) {
      const node = layer[0];
      const vis = AGENT_VISUALS[node.role] ?? { label: node.role, color: "#90A4AE", icon: "" };
      nodes.push({
        role: node.role,
        x,
        y: NODE_CENTER_Y,
        color: vis.color,
        label: vis.label,
        icon: vis.icon,
        nodeType: node.nodeType,
        parallel: node.parallel,
      });
    } else {
      // Fan-out: stack vertically
      const totalHeight = (layer.length - 1) * PARALLEL_SPACING;
      const startY = NODE_CENTER_Y - totalHeight / 2;
      for (let ni = 0; ni < layer.length; ni++) {
        const node = layer[ni];
        const vis = AGENT_VISUALS[node.role] ?? { label: node.role, color: "#90A4AE", icon: "" };
        nodes.push({
          role: node.role,
          x,
          y: startY + ni * PARALLEL_SPACING,
          color: vis.color,
          label: vis.label,
          icon: vis.icon,
          nodeType: node.nodeType,
          parallel: node.parallel,
        });
      }
    }

    if (x > maxX) maxX = x;
  }

  return { nodes, width: maxX + PADDING_X * 2 };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface WorkflowGraphProps {
  activeAgent: AgentRole | null;
  cycle: number;
  status: PipelineStatus;
  completedAgents?: AgentRole[];
  agentGraph?: AgentGraphNode[];
}

export function WorkflowGraph({
  activeAgent,
  cycle,
  status,
  completedAgents = [],
  agentGraph,
}: WorkflowGraphProps) {
  const isRunning = status === PIPELINE_STATUSES.RUNNING;
  const completedSet = new Set(completedAgents);

  const graph = agentGraph?.length ? agentGraph.filter((n) => n.enabled) : DEFAULT_AGENT_GRAPH;
  const { nodes, width } = useMemo(() => computeLayout(graph), [graph]);

  const svgWidth = Math.max(width, 400);

  // Compute edges from runAfter relationships
  const edges = useMemo(() => {
    const result: { from: LayoutNode; to: LayoutNode }[] = [];
    for (const node of graph) {
      const toLayout = nodes.find((n) => n.role === node.role);
      if (!toLayout) continue;
      for (const dep of node.runAfter) {
        const fromLayout = nodes.find((n) => n.role === dep);
        if (fromLayout) result.push({ from: fromLayout, to: toLayout });
      }
    }
    return result;
  }, [graph, nodes]);

  // Find the last node and first cycle node for loop-back arc
  const exitNode = nodes.find((n) => n.nodeType === GRAPH_NODE_TYPES.EXIT);
  const firstCycleNode = nodes.find(
    (n) => n.nodeType === GRAPH_NODE_TYPES.CYCLE,
  );

  return (
    <div
      className="flex items-center justify-center px-4 py-3 backdrop-blur-sm"
      style={{ background: "rgba(20, 21, 31, 0.7)" }}
    >
      <svg
        viewBox={`0 0 ${svgWidth} ${SVG_HEIGHT}`}
        className="h-[90px] w-full"
        style={{ maxWidth: svgWidth }}
        aria-label="Agent pipeline workflow"
      >
        <defs>
          {nodes.map((node) => (
            <filter key={`glow-${node.role}`} id={`glow-${node.role}`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor={node.color} floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
          <filter id="glow-loop" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor="#B026FF" floodOpacity="0.3" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Edges ──────────────────────────────────────── */}
        {edges.map(({ from, to }, i) => {
          const isActive = isRunning && activeAgent === to.role;
          const isTraversed = completedSet.has(from.role) && (completedSet.has(to.role) || isActive);

          return (
            <g key={`edge-${i}`}>
              <line
                x1={from.x + NODE_RADIUS + 4}
                y1={from.y}
                x2={to.x - NODE_RADIUS - 4}
                y2={to.y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              />
              <motion.line
                x1={from.x + NODE_RADIUS + 4}
                y1={from.y}
                x2={to.x - NODE_RADIUS - 4}
                y2={to.y}
                stroke={isActive || isTraversed ? to.color : "rgba(255,255,255,0.12)"}
                strokeWidth={isActive ? 2.5 : isTraversed ? 2 : 1}
                strokeDasharray={isActive ? "10 6" : "none"}
                strokeLinecap="round"
                initial={false}
                animate={{
                  strokeDashoffset: isActive ? [-32, 0] : 0,
                  strokeOpacity: isActive ? 1 : isTraversed ? 0.7 : 0.15,
                }}
                transition={
                  isActive
                    ? { strokeDashoffset: { duration: 0.8, repeat: Infinity, ease: "linear" }, strokeOpacity: { duration: 0.3 } }
                    : { duration: 0.4 }
                }
              />
            </g>
          );
        })}

        {/* ── Loop-back arc ──────────────────────────────── */}
        {exitNode && firstCycleNode && (
          <motion.path
            d={`M ${exitNode.x + NODE_RADIUS + 6} ${exitNode.y - 10}
                C ${exitNode.x + 60} ${-10},
                  ${firstCycleNode.x - 60} ${-10},
                  ${firstCycleNode.x - NODE_RADIUS - 6} ${firstCycleNode.y - 10}`}
            fill="none"
            stroke="#B026FF"
            strokeWidth={2}
            strokeDasharray="8 6"
            strokeLinecap="round"
            filter="url(#glow-loop)"
            initial={false}
            animate={{
              strokeDashoffset: isRunning ? [-28, 0] : 0,
              strokeOpacity: isRunning ? 0.8 : 0.25,
            }}
            transition={
              isRunning
                ? { strokeDashoffset: { duration: 1.5, repeat: Infinity, ease: "linear" }, strokeOpacity: { duration: 0.5 } }
                : { duration: 0.5 }
            }
          />
        )}

        {/* ── Cycle badge ────────────────────────────────── */}
        <AnimatePresence>
          {cycle > 0 && (
            <motion.g
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={SPRING}
            >
              <rect
                x={svgWidth / 2 - 20}
                y={1}
                width={40}
                height={18}
                rx={9}
                fill="rgba(20, 21, 31, 0.8)"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={0.5}
              />
              <text
                x={svgWidth / 2}
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

        {/* ── Nodes ──────────────────────────────────────── */}
        {nodes.map((node) => {
          const isCurrent = activeAgent === node.role && isRunning;
          const isCompleted = completedSet.has(node.role);

          return (
            <g key={node.role}>
              {/* Breathing glow ring */}
              <AnimatePresence>
                {isCurrent && (
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={NODE_RADIUS + 8}
                    fill="none"
                    stroke={node.color}
                    strokeWidth={1.5}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.6, 0.3] }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={BREATHE_TRANSITION}
                    style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                  />
                )}
              </AnimatePresence>

              {/* Glass backdrop */}
              <circle
                cx={node.x}
                cy={node.y}
                r={NODE_RADIUS}
                fill={isCurrent ? node.color : "rgba(20, 21, 31, 0.6)"}
                fillOpacity={isCurrent ? 0.15 : 1}
                stroke={isCompleted ? node.color : "rgba(255,255,255,0.12)"}
                strokeWidth={isCurrent ? 2 : isCompleted ? 1.5 : 1}
              />

              {/* Agent color fill */}
              <circle
                cx={node.x}
                cy={node.y}
                r={NODE_RADIUS}
                fill={node.color}
                fillOpacity={isCurrent ? 0.15 : isCompleted ? 0.1 : 0.08}
                filter={isCurrent ? `url(#glow-${node.role})` : undefined}
              />

              {/* Icon */}
              {isCompleted && !isCurrent ? (
                <motion.g
                  transform={`translate(${node.x - 7}, ${node.y - 7})`}
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
                <g transform={`translate(${node.x - 8}, ${node.y - 8}) scale(0.667)`}>
                  <path
                    d={node.icon}
                    fill="none"
                    stroke={isCurrent ? node.color : isCompleted ? node.color : "#B0BEC5"}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )}

              {/* Label */}
              <text
                x={node.x}
                y={node.y + NODE_RADIUS + 14}
                textAnchor="middle"
                fill={isCurrent ? node.color : "#B0BEC5"}
                fontSize={8}
                fontFamily="var(--font-body)"
                letterSpacing="0.1em"
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
