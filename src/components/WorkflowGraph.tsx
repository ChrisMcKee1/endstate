"use client";

import { useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentRole, PipelineStatus, AgentGraphNode, Domain } from "@/lib/types";
import { AGENT_ROLES, DOMAINS, PIPELINE_STATUSES, GRAPH_NODE_TYPES, DEFAULT_AGENT_GRAPH, getDomainFromRole } from "@/lib/types";
import { getAgentVisual } from "@/lib/agent-visuals";

// ─── Constants ───────────────────────────────────────────────────────────────

const DOMAIN_LABELS: Record<string, string> = {
  [DOMAINS.UI]: "UI",
  [DOMAINS.BACKEND]: "Backend",
  [DOMAINS.DATABASE]: "Database",
  [DOMAINS.DOCS]: "Docs",
};

// Domain colors are centralized in globals.css as --color-domain-* vars.
// These hex values must match for SVG rendering (SVG can't resolve CSS vars).
// Source of truth: globals.css → --color-domain-*
const DOMAIN_COLORS: Record<string, string> = {
  [DOMAINS.UI]: "#00E5FF",
  [DOMAINS.BACKEND]: "#B026FF",
  [DOMAINS.DATABASE]: "#FFD700",
  [DOMAINS.DOCS]: "#FF69B4",
};

const NODE_RADIUS = 20;
const LAYER_GAP = 72;
const DOMAIN_SPREAD = 110;
const PADDING_Y = 40;
const PADDING_X = 60;

const BREATHE_TRANSITION = {
  duration: 2,
  repeat: Infinity,
  repeatType: "reverse" as const,
  ease: "easeInOut" as const,
};

const SPRING = { type: "spring" as const, stiffness: 200, damping: 20 };

// Cycle arc colors — clockwise flow
const LOOP_COLOR_RIGHT = "#A855F7"; // violet — Explorer → UX (down the right)
const LOOP_COLOR_LEFT = "#6366F1";  // indigo — UX → Explorer (up the left)
const LOOP_MARGIN = 140; // Must be large — cubic bezier peaks at ~75% of control point distance from center

// ─── Layout computation ──────────────────────────────────────────────────────

interface LayoutNode {
  role: AgentRole;
  x: number;
  y: number;
  color: string;
  label: string;
  icon: string;
  description: string;
  nodeType: string;
  parallel: boolean;
  domain?: Domain;
  dynamicEnable?: boolean;
}

interface LayoutEdge {
  from: LayoutNode;
  to: LayoutNode;
}

/**
 * Compute a vertical DAG layout.
 * Nodes are arranged top-to-bottom by topological depth.
 * Parallel siblings at the same depth are fanned out horizontally.
 */
function computeLayout(graph: AgentGraphNode[]): {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
} {
  if (graph.length === 0) return { nodes: [], edges: [], width: 400, height: 200 };

  // Compute topological depth
  const depth: Record<string, number> = {};
  function computeDepth(role: string): number {
    if (depth[role] !== undefined) return depth[role];
    const node = graph.find((n) => n.role === role);
    if (!node || node.runAfter.length === 0) {
      depth[role] = 0;
      return 0;
    }
    const maxParent = Math.max(...node.runAfter.map((dep) => computeDepth(dep)));
    depth[role] = maxParent + 1;
    return depth[role];
  }
  for (const node of graph) computeDepth(node.role);

  // Group by depth into layers
  const layers: AgentGraphNode[][] = [];
  for (const node of graph) {
    const d = depth[node.role] ?? 0;
    if (!layers[d]) layers[d] = [];
    layers[d].push(node);
  }

  // Figure out max layer width for centering
  let maxLayerWidth = 0;
  for (const layer of layers) {
    if (!layer) continue;
    if (layer.length > 1) {
      maxLayerWidth = Math.max(maxLayerWidth, (layer.length - 1) * DOMAIN_SPREAD);
    }
  }

  const centerX = Math.max(PADDING_X + maxLayerWidth / 2, 200);

  // Compute positions
  const nodes: LayoutNode[] = [];
  let maxX = 0;

  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    if (!layer) continue;
    const y = PADDING_Y + li * LAYER_GAP;

    if (layer.length === 1) {
      const node = layer[0];
      const vis = getAgentVisual(node.role);
      nodes.push({
        role: node.role, x: centerX, y,
        color: vis.hex, label: vis.tag, icon: vis.icon,
        description: vis.description,
        nodeType: node.nodeType, parallel: node.parallel,
        domain: node.domain as Domain | undefined,
        dynamicEnable: node.dynamicEnable,
      });
      maxX = Math.max(maxX, centerX + PADDING_X);
    } else {
      const totalWidth = (layer.length - 1) * DOMAIN_SPREAD;
      const startX = centerX - totalWidth / 2;
      for (let ni = 0; ni < layer.length; ni++) {
        const node = layer[ni];
        const vis = getAgentVisual(node.role);
        const x = startX + ni * DOMAIN_SPREAD;
        nodes.push({
          role: node.role, x, y,
          color: vis.hex, label: vis.tag, icon: vis.icon,
          description: vis.description,
          nodeType: node.nodeType, parallel: node.parallel,
          domain: node.domain as Domain | undefined,
          dynamicEnable: node.dynamicEnable,
        });
        maxX = Math.max(maxX, x + PADDING_X);
      }
    }
  }

  const height = PADDING_Y + (layers.length - 1) * LAYER_GAP + PADDING_Y;

  // Compute edges
  const edges: LayoutEdge[] = [];
  for (const node of graph) {
    const toLayout = nodes.find((n) => n.role === node.role);
    if (!toLayout) continue;
    for (const dep of node.runAfter) {
      const fromLayout = nodes.find((n) => n.role === dep);
      if (fromLayout) edges.push({ from: fromLayout, to: toLayout });
    }
  }

  return { nodes, edges, width: Math.max(maxX, 400), height };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface WorkflowGraphProps {
  activeAgent: AgentRole | null;
  activeAgents?: AgentRole[];
  activeDomains?: Domain[];
  cycle: number;
  status: PipelineStatus;
  completedAgents?: AgentRole[];
  agentGraph?: AgentGraphNode[];
  onAgentClick?: (role: AgentRole) => void;
  selectedAgent?: AgentRole | null;
}

export function WorkflowGraph({
  activeAgent,
  activeAgents = [],
  activeDomains = [],
  cycle,
  status,
  completedAgents = [],
  agentGraph,
  onAgentClick,
  selectedAgent,
}: WorkflowGraphProps) {
  const isRunning = status === PIPELINE_STATUSES.RUNNING;
  const completedSet = useMemo(() => new Set(completedAgents), [completedAgents]);
  const activeSet = useMemo(
    () => new Set(activeAgents.length > 0 ? activeAgents : activeAgent ? [activeAgent] : []),
    [activeAgents, activeAgent],
  );
  const activeDomainSet = useMemo(() => new Set(activeDomains), [activeDomains]);

  const graph = useMemo(
    () => agentGraph?.length ? agentGraph.filter((n) => n.enabled) : DEFAULT_AGENT_GRAPH,
    [agentGraph],
  );
  const { nodes, edges, width, height } = useMemo(() => computeLayout(graph), [graph]);

  const handleNodeClick = useCallback(
    (role: AgentRole) => { onAgentClick?.(role); },
    [onAgentClick],
  );

  // Find exit (UX) and explorer nodes for cycle arcs
  const exitNode = nodes.find((n) => n.nodeType === GRAPH_NODE_TYPES.EXIT);
  const explorerNode = nodes.find((n) => n.role === AGENT_ROLES.EXPLORER);
  const hasLoop = !!(exitNode && explorerNode);

  // Two separate side arcs instead of one wrap-around
  const rightmostX = nodes.length > 0 ? Math.max(...nodes.map((n) => n.x)) : width;
  const leftmostX = nodes.length > 0 ? Math.min(...nodes.map((n) => n.x)) : 0;
  const arcRight = rightmostX + NODE_RADIUS + LOOP_MARGIN;
  const arcLeft = leftmostX - NODE_RADIUS - LOOP_MARGIN;

  // Right arc: Explorer → UX (clockwise, curves down the right side)
  const rightArcPath = hasLoop
    ? `M ${explorerNode!.x + NODE_RADIUS + 8} ${explorerNode!.y}
       C ${arcRight} ${explorerNode!.y},
         ${arcRight} ${exitNode!.y},
         ${exitNode!.x + NODE_RADIUS + 8} ${exitNode!.y}`
    : "";

  // Left arc: UX → Explorer (clockwise, curves up the left side)
  const leftArcPath = hasLoop
    ? `M ${exitNode!.x - NODE_RADIUS - 8} ${exitNode!.y}
       C ${arcLeft} ${exitNode!.y},
         ${arcLeft} ${explorerNode!.y},
         ${explorerNode!.x - NODE_RADIUS - 8} ${explorerNode!.y}`
    : "";

  const svgViewBox = hasLoop
    ? `${arcLeft - 15} 0 ${arcRight - arcLeft + 30} ${height}`
    : `0 0 ${width} ${height}`;

  // Collect unique domain columns for labels
  const domainColumns = useMemo(() => {
    const cols: { domain: Domain; x: number }[] = [];
    const seen = new Set<string>();
    for (const node of nodes) {
      if (node.domain && !seen.has(node.domain)) {
        seen.add(node.domain);
        cols.push({ domain: node.domain, x: node.x });
      }
    }
    return cols;
  }, [nodes]);

  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-auto"
      style={{ background: "rgba(20, 21, 31, 0.5)" }}
    >
      <svg
        viewBox={svgViewBox}
        preserveAspectRatio="xMidYMid meet"
        className="h-full max-h-full w-full"
        style={{ minHeight: 300 }}
        aria-label="Agent pipeline workflow"
      >
        <defs>
          {nodes.map((node) => (
            <filter key={`glow-${node.role}`} id={`glow-${node.role}`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor={node.color} floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
          {/* Right arc glow (violet) */}
          <filter id="glow-arc-right" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor={LOOP_COLOR_RIGHT} floodOpacity="0.25" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Left arc glow (indigo) */}
          <filter id="glow-arc-left" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor={LOOP_COLOR_LEFT} floodOpacity="0.25" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Arrowhead markers */}
          <marker id="arrow-right" viewBox="0 0 8 8" refX="8" refY="4"
            markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 0 L 8 4 L 0 8 z" fill={LOOP_COLOR_RIGHT} fillOpacity="0.7" />
          </marker>
          <marker id="arrow-left" viewBox="0 0 8 8" refX="8" refY="4"
            markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 0 L 8 4 L 0 8 z" fill={LOOP_COLOR_LEFT} fillOpacity="0.7" />
          </marker>
        </defs>

        {/* ── Cycle arcs (background layer, behind everything) ── */}

        {/* Right arc: Explorer → UX (violet, clockwise down) */}
        {hasLoop && (
          <>
            <path d={rightArcPath} fill="none" stroke={LOOP_COLOR_RIGHT} strokeOpacity={0.04} strokeWidth={1} />
            <motion.path
              d={rightArcPath}
              fill="none"
              stroke={LOOP_COLOR_RIGHT}
              strokeWidth={1.5}
              strokeLinecap="round"
              filter="url(#glow-arc-right)"
              markerEnd="url(#arrow-right)"
              initial={false}
              animate={{
                pathLength: isRunning ? 0.35 : 1,
                pathOffset: isRunning ? [0, 1] : 0,
                pathSpacing: isRunning ? 0.65 : 0,
                strokeOpacity: isRunning ? 0.55 : 0.1,
              }}
              transition={
                isRunning
                  ? {
                      pathOffset: { duration: 2.5, repeat: Infinity, ease: "linear" },
                      pathLength: { duration: 0.5 },
                      pathSpacing: { duration: 0.5 },
                      strokeOpacity: { duration: 0.5 },
                    }
                  : { duration: 0.5 }
              }
            />
          </>
        )}

        {/* Left arc: UX → Explorer (indigo, clockwise up) */}
        {hasLoop && (
          <>
            <path d={leftArcPath} fill="none" stroke={LOOP_COLOR_LEFT} strokeOpacity={0.04} strokeWidth={1} />
            <motion.path
              d={leftArcPath}
              fill="none"
              stroke={LOOP_COLOR_LEFT}
              strokeWidth={1.5}
              strokeLinecap="round"
              filter="url(#glow-arc-left)"
              markerEnd="url(#arrow-left)"
              initial={false}
              animate={{
                pathLength: isRunning ? 0.35 : 1,
                pathOffset: isRunning ? [0, 1] : 0,
                pathSpacing: isRunning ? 0.65 : 0,
                strokeOpacity: isRunning ? 0.55 : 0.1,
              }}
              transition={
                isRunning
                  ? {
                      pathOffset: { duration: 2.5, repeat: Infinity, ease: "linear" },
                      pathLength: { duration: 0.5 },
                      pathSpacing: { duration: 0.5 },
                      strokeOpacity: { duration: 0.5 },
                    }
                  : { duration: 0.5 }
              }
            />
          </>
        )}

        {/* ── Domain column labels ─────────────────────────── */}
        {domainColumns.map(({ domain, x }) => {
          const isDomainActive = activeDomainSet.size === 0 || activeDomainSet.has(domain);
          const domainColor = DOMAIN_COLORS[domain] ?? "rgba(255,255,255,0.4)";
          return (
            <text
              key={`domain-label-${domain}`}
              x={x}
              y={PADDING_Y + LAYER_GAP * 1.5}
              textAnchor="middle"
              fill={domainColor}
              opacity={isDomainActive ? 0.7 : 0.2}
              fontSize={8}
              fontFamily="var(--font-body)"
              letterSpacing="0.15em"
              fontWeight={600}
            >
              {DOMAIN_LABELS[domain]?.toUpperCase() ?? domain.toUpperCase()}
            </text>
          );
        })}

        {/* ── Edges ──────────────────────────────────────── */}
        {edges.map(({ from, to }, i) => {
          const isActive = isRunning && activeSet.has(to.role);
          const isTraversed = completedSet.has(from.role) && (completedSet.has(to.role) || isActive);
          const isDomainEdge = to.domain != null;
          const isDomainActive = !isDomainEdge || activeDomainSet.size === 0 || activeDomainSet.has(to.domain!);

          const fromY = from.y + NODE_RADIUS + 4;
          const toY = to.y - NODE_RADIUS - 4;
          const dx = to.x - from.x;
          const dy = toY - fromY;
          const isStraight = Math.abs(dx) < 2;

          const pathD = isStraight
            ? `M ${from.x} ${fromY} L ${to.x} ${toY}`
            : `M ${from.x} ${fromY} C ${from.x} ${fromY + dy * 0.4}, ${to.x} ${toY - dy * 0.4}, ${to.x} ${toY}`;

          return (
            <g key={`edge-${i}`}>
              <path d={pathD} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              <motion.path
                d={pathD}
                fill="none"
                stroke={
                  !isDomainActive ? "rgba(255,255,255,0.06)"
                    : isActive || isTraversed ? to.color
                    : "rgba(255,255,255,0.12)"
                }
                strokeWidth={isActive ? 2.5 : isTraversed ? 1.5 : 0.5}
                strokeDasharray={isActive ? "8 5" : "none"}
                strokeLinecap="round"
                initial={false}
                animate={{
                  strokeDashoffset: isActive ? [-26, 0] : 0,
                  strokeOpacity: !isDomainActive ? 0.06 : isActive ? 1 : isTraversed ? 0.4 : 0.1,
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

        {/* ── Cycle badge ────────────────────────────────── */}
        <AnimatePresence>
          {cycle > 0 && (
            <motion.g
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={SPRING}
            >
              <rect x={width / 2 - 22} y={4} width={44} height={18} rx={9}
                fill="rgba(20, 21, 31, 0.8)" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
              <text x={width / 2} y={16} textAnchor="middle" fill="#94A3B8"
                fontSize={9} fontFamily="var(--font-code)">
                Cycle {cycle}
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Nodes ──────────────────────────────────────── */}
        {nodes.map((node) => {
          const isCurrent = activeSet.has(node.role) && isRunning;
          const isCompleted = completedSet.has(node.role) && !isCurrent;
          const isSelected = selectedAgent === node.role;
          const nodeDomain = getDomainFromRole(node.role);
          const isDomainActive = !nodeDomain || activeDomainSet.size === 0 || activeDomainSet.has(nodeDomain);
          const isDimmed = node.dynamicEnable && !isDomainActive;

          return (
            <g
              key={node.role}
              onClick={() => handleNodeClick(node.role)}
              style={{ cursor: onAgentClick ? "pointer" : "default" }}
              opacity={isDimmed ? 0.2 : 1}
            >
              {/* Native SVG tooltip */}
              <title>{`${node.label}\n${node.description}`}</title>

              {/* Breathing glow ring */}
              <AnimatePresence>
                {isCurrent && (
                  <motion.circle
                    key={`breathe-${node.role}`}
                    cx={node.x} cy={node.y} r={NODE_RADIUS + 8}
                    fill="none" stroke={node.color} strokeWidth={1.5}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.6, 0.3] }}
                    exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.4 } }}
                    transition={BREATHE_TRANSITION}
                    style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                  />
                )}
              </AnimatePresence>

              {/* Selected ring */}
              {isSelected && (
                <circle cx={node.x} cy={node.y} r={NODE_RADIUS + 5}
                  fill="none" stroke={node.color} strokeWidth={2}
                  strokeDasharray={isDimmed ? "4 3" : "none"} opacity={0.8} />
              )}

              {/* Glass backdrop */}
              <motion.circle cx={node.x} cy={node.y} r={NODE_RADIUS}
                fill={isCurrent ? node.color : "rgba(20, 21, 31, 0.6)"}
                initial={false}
                animate={{
                  fillOpacity: isCurrent ? 0.2 : 1,
                  strokeWidth: isCurrent ? 2.5 : isCompleted ? 1.5 : 0.5,
                  strokeOpacity: isDimmed ? 0.06 : isCurrent ? 1 : isCompleted ? 0.4 : 0.08,
                }}
                stroke={
                  isDimmed ? "rgba(255,255,255,0.06)"
                    : isCurrent ? node.color
                    : isCompleted ? node.color
                    : "rgba(255,255,255,0.08)"
                }
                strokeDasharray={isDimmed ? "4 3" : "none"}
                transition={{ duration: 0.6, ease: "easeOut" }} />

              {/* Agent color fill — only visible when active or completed */}
              <motion.circle cx={node.x} cy={node.y} r={NODE_RADIUS}
                fill={node.color}
                initial={false}
                animate={{
                  fillOpacity: isCurrent ? 0.25 : isCompleted ? 0.08 : 0,
                }}
                filter={isCurrent ? `url(#glow-${node.role})` : "none"}
                transition={{ duration: 0.6, ease: "easeOut" }} />

              {/* Icon — always shows domain icon, colored when active/completed */}
              <g transform={`translate(${node.x - 8}, ${node.y - 8}) scale(0.667)`}>
                <motion.path
                  d={node.icon}
                  fill="none"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={false}
                  animate={{
                    stroke: isCurrent ? node.color : isCompleted ? node.color : "rgba(176,190,197,0.35)",
                    strokeOpacity: isCurrent ? 1 : isCompleted ? 0.7 : 0.35,
                  }}
                  transition={{ duration: 0.4 }}
                />
              </g>

              {/* Completion badge — small check in bottom-right corner */}
              <AnimatePresence>
                {isCompleted && (
                  <motion.g
                    key={`check-${node.role}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={SPRING}
                  >
                    <circle cx={node.x + NODE_RADIUS - 3} cy={node.y + NODE_RADIUS - 3} r={6}
                      fill="rgba(20, 21, 31, 0.9)" stroke={node.color} strokeWidth={1} />
                    <path
                      d={`M ${node.x + NODE_RADIUS - 6} ${node.y + NODE_RADIUS - 3} l 2.5 2.5 L ${node.x + NODE_RADIUS} ${node.y + NODE_RADIUS - 6}`}
                      fill="none" stroke={node.color} strokeWidth={1.5}
                      strokeLinecap="round" strokeLinejoin="round" />
                  </motion.g>
                )}
              </AnimatePresence>

              {/* Label */}
              <text x={node.x} y={node.y + NODE_RADIUS + 13}
                textAnchor="middle"
                fill={node.color}
                opacity={isCurrent ? 1 : isCompleted ? 0.8 : isDimmed ? 0.15 : 0.6}
                fontSize={7} fontFamily="var(--font-body)"
                letterSpacing="0.1em" fontWeight={isCurrent ? 700 : isCompleted ? 600 : 400}>
                {node.label.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
