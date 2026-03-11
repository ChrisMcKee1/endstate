// ─── Centralized agent visual config ──────────────────────────────────────────
//
// Single source of truth for all per-agent colors, labels, Tailwind classes,
// and SVG icons. Every component that needs agent-specific styling imports
// from here instead of maintaining its own copy.

import { AGENT_ROLES, type AgentRole } from "@/lib/types";

export interface AgentVisual {
  /** Human-readable label: "Researcher", "Analyst: UI" */
  label: string;
  /** Compact tag for badges: "RESEARCHER", "ANALYST:UI" */
  tag: string;
  /** Short help text describing this agent's purpose */
  description: string;
  /** Primary hex color */
  hex: string;
  /** Gradient-end hex for CSS linear-gradient */
  gradientEnd: string;
  /** Tailwind text class */
  text: string;
  /** Tailwind solid bg class */
  bg: string;
  /** Tailwind 10% bg class */
  bgDim: string;
  /** Tailwind 20% bg class */
  bgBadge: string;
  /** Tailwind border class */
  border: string;
  /** Tailwind gradient-from class */
  gradientFrom: string;
  /** Tailwind glow shadow class */
  glow: string;
  /** SVG icon path d-attribute */
  icon: string;
}

export const AGENT_VISUALS: Record<AgentRole, AgentVisual> = {
  [AGENT_ROLES.RESEARCHER]: {
    label: "Researcher",
    tag: "RESEARCHER",
    description: "Runs once at pipeline start to learn the project — discovers tech stack, architecture, build commands, and creates a cheat sheet for all other agents.",
    hex: "#FF6B6B",
    gradientEnd: "#EE5A5A",
    text: "text-agent-researcher",
    bg: "bg-agent-researcher",
    bgDim: "bg-agent-researcher/10",
    bgBadge: "bg-agent-researcher/20",
    border: "border-agent-researcher",
    gradientFrom: "from-agent-researcher/[0.03]",
    glow: "shadow-[0_0_8px_rgba(255,107,107,0.5)]",
    icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  },
  [AGENT_ROLES.EXPLORER]: {
    label: "Explorer",
    tag: "EXPLORER",
    description: "Navigates the running app in a browser, exercises user flows, and creates tasks for every bug, broken UI element, or unexpected behavior found.",
    hex: "#00E5FF",
    gradientEnd: "#00B8D4",
    text: "text-agent-explorer",
    bg: "bg-agent-explorer",
    bgDim: "bg-agent-explorer/10",
    bgBadge: "bg-agent-explorer/20",
    border: "border-agent-explorer",
    gradientFrom: "from-agent-explorer/[0.03]",
    glow: "shadow-[0_0_8px_rgba(0,229,255,0.5)]",
    icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z",
  },
  [AGENT_ROLES.ANALYST]: {
    label: "Analyst",
    tag: "ANALYST",
    description: "Cross-references Explorer findings with the codebase, diagnoses root causes, adjusts severity, and decides whether the pipeline should continue or stop.",
    hex: "#B026FF",
    gradientEnd: "#9C27B0",
    text: "text-agent-analyst",
    bg: "bg-agent-analyst",
    bgDim: "bg-agent-analyst/10",
    bgBadge: "bg-agent-analyst/20",
    border: "border-agent-analyst",
    gradientFrom: "from-agent-analyst/[0.03]",
    glow: "shadow-[0_0_8px_rgba(176,38,255,0.5)]",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  },
  [AGENT_ROLES.FIXER]: {
    label: "Fixer",
    tag: "FIXER",
    description: "Applies minimal code fixes for diagnosed tasks, verifies builds pass after each change, commits working fixes, and reverts anything that breaks.",
    hex: "#00FFA3",
    gradientEnd: "#00C853",
    text: "text-agent-fixer",
    bg: "bg-agent-fixer",
    bgDim: "bg-agent-fixer/10",
    bgBadge: "bg-agent-fixer/20",
    border: "border-agent-fixer",
    gradientFrom: "from-agent-fixer/[0.03]",
    glow: "shadow-[0_0_8px_rgba(0,255,163,0.5)]",
    icon: "M11.42 15.17l-5.1-5.1m0 0L11.42 4.96m-5.1 5.11h13.86",
  },
  [AGENT_ROLES.ANALYST_UI]: {
    label: "Analyst: UI",
    tag: "ANALYST:UI",
    description: "Analyses UI-specific findings — components, layouts, styling, accessibility, and client-side rendering issues.",
    hex: "#00E5FF",
    gradientEnd: "#00B8D4",
    text: "text-agent-analyst-ui",
    bg: "bg-agent-analyst-ui",
    bgDim: "bg-agent-analyst-ui/10",
    bgBadge: "bg-agent-analyst-ui/20",
    border: "border-agent-analyst-ui",
    gradientFrom: "from-agent-analyst-ui/[0.03]",
    glow: "shadow-[0_0_8px_rgba(0,229,255,0.5)]",
    icon: "M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12",
  },
  [AGENT_ROLES.ANALYST_BACKEND]: {
    label: "Analyst: Backend",
    tag: "ANALYST:BE",
    description: "Analyses backend findings — API routes, server actions, middleware, auth, integrations, and business logic issues.",
    hex: "#B026FF",
    gradientEnd: "#9C27B0",
    text: "text-agent-analyst-backend",
    bg: "bg-agent-analyst-backend",
    bgDim: "bg-agent-analyst-backend/10",
    bgBadge: "bg-agent-analyst-backend/20",
    border: "border-agent-analyst-backend",
    gradientFrom: "from-agent-analyst-backend/[0.03]",
    glow: "shadow-[0_0_8px_rgba(176,38,255,0.5)]",
    icon: "M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0h.375a.375.375 0 01.375.375v2.25a.375.375 0 01-.375.375H21",
  },
  [AGENT_ROLES.ANALYST_DATABASE]: {
    label: "Analyst: Database",
    tag: "ANALYST:DB",
    description: "Analyses database findings — schemas, migrations, ORM queries, data integrity, and caching issues.",
    hex: "#FFD700",
    gradientEnd: "#FFC107",
    text: "text-agent-analyst-database",
    bg: "bg-agent-analyst-database",
    bgDim: "bg-agent-analyst-database/10",
    bgBadge: "bg-agent-analyst-database/20",
    border: "border-agent-analyst-database",
    gradientFrom: "from-agent-analyst-database/[0.03]",
    glow: "shadow-[0_0_8px_rgba(255,215,0,0.5)]",
    icon: "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125",
  },
  [AGENT_ROLES.ANALYST_DOCS]: {
    label: "Analyst: Docs",
    tag: "ANALYST:DOC",
    description: "Analyses documentation gaps — README accuracy, API docs, code comments, setup guides, and missing JSDoc annotations.",
    hex: "#FF69B4",
    gradientEnd: "#FF1493",
    text: "text-agent-analyst-docs",
    bg: "bg-agent-analyst-docs",
    bgDim: "bg-agent-analyst-docs/10",
    bgBadge: "bg-agent-analyst-docs/20",
    border: "border-agent-analyst-docs",
    gradientFrom: "from-agent-analyst-docs/[0.03]",
    glow: "shadow-[0_0_8px_rgba(255,105,180,0.5)]",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  },
  [AGENT_ROLES.FIXER_UI]: {
    label: "Fixer: UI",
    tag: "FIXER:UI",
    description: "Applies fixes to UI code — components, styles, layouts, accessibility markup, and client-side rendering.",
    hex: "#00E5FF",
    gradientEnd: "#00B8D4",
    text: "text-agent-fixer-ui",
    bg: "bg-agent-fixer-ui",
    bgDim: "bg-agent-fixer-ui/10",
    bgBadge: "bg-agent-fixer-ui/20",
    border: "border-agent-fixer-ui",
    gradientFrom: "from-agent-fixer-ui/[0.03]",
    glow: "shadow-[0_0_8px_rgba(0,229,255,0.5)]",
    icon: "M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12",
  },
  [AGENT_ROLES.FIXER_BACKEND]: {
    label: "Fixer: Backend",
    tag: "FIXER:BE",
    description: "Applies fixes to backend code — API routes, middleware, auth, integrations, validation, and error handling.",
    hex: "#B026FF",
    gradientEnd: "#9C27B0",
    text: "text-agent-fixer-backend",
    bg: "bg-agent-fixer-backend",
    bgDim: "bg-agent-fixer-backend/10",
    bgBadge: "bg-agent-fixer-backend/20",
    border: "border-agent-fixer-backend",
    gradientFrom: "from-agent-fixer-backend/[0.03]",
    glow: "shadow-[0_0_8px_rgba(176,38,255,0.5)]",
    icon: "M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0h.375a.375.375 0 01.375.375v2.25a.375.375 0 01-.375.375H21",
  },
  [AGENT_ROLES.FIXER_DATABASE]: {
    label: "Fixer: Database",
    tag: "FIXER:DB",
    description: "Applies fixes to data layer code — schemas, migrations, ORM config, queries, and seed data.",
    hex: "#FFD700",
    gradientEnd: "#FFC107",
    text: "text-agent-fixer-database",
    bg: "bg-agent-fixer-database",
    bgDim: "bg-agent-fixer-database/10",
    bgBadge: "bg-agent-fixer-database/20",
    border: "border-agent-fixer-database",
    gradientFrom: "from-agent-fixer-database/[0.03]",
    glow: "shadow-[0_0_8px_rgba(255,215,0,0.5)]",
    icon: "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125",
  },
  [AGENT_ROLES.FIXER_DOCS]: {
    label: "Fixer: Docs",
    tag: "FIXER:DOC",
    description: "Updates documentation — README, API docs, code comments, setup guides, and JSDoc annotations to match the current codebase.",
    hex: "#FF69B4",
    gradientEnd: "#FF1493",
    text: "text-agent-fixer-docs",
    bg: "bg-agent-fixer-docs",
    bgDim: "bg-agent-fixer-docs/10",
    bgBadge: "bg-agent-fixer-docs/20",
    border: "border-agent-fixer-docs",
    gradientFrom: "from-agent-fixer-docs/[0.03]",
    glow: "shadow-[0_0_8px_rgba(255,105,180,0.5)]",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  },
  [AGENT_ROLES.CONSOLIDATOR]: {
    label: "Consolidator",
    tag: "MERGE",
    description: "Merges worktree changes from all domain fixers, verifies the combined build passes, resolves conflicts, and decides continue or stop.",
    hex: "#38BDF8",
    gradientEnd: "#0EA5E9",
    text: "text-agent-consolidator",
    bg: "bg-agent-consolidator",
    bgDim: "bg-agent-consolidator/10",
    bgBadge: "bg-agent-consolidator/20",
    border: "border-agent-consolidator",
    gradientFrom: "from-agent-consolidator/[0.03]",
    glow: "shadow-[0_0_8px_rgba(56,189,248,0.5)]",
    icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
  },
  [AGENT_ROLES.UX_REVIEWER]: {
    label: "UX Reviewer",
    tag: "UX",
    description: "Evaluates the app from a non-technical user perspective — scores navigation, error handling, empty states, accessibility, and visual design.",
    hex: "#FFB800",
    gradientEnd: "#FF9100",
    text: "text-agent-ux",
    bg: "bg-agent-ux",
    bgDim: "bg-agent-ux/10",
    bgBadge: "bg-agent-ux/20",
    border: "border-agent-ux",
    gradientFrom: "from-agent-ux/[0.03]",
    glow: "shadow-[0_0_8px_rgba(255,184,0,0.5)]",
    icon: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z",
  },
  [AGENT_ROLES.CODE_SIMPLIFIER]: {
    label: "Code Simplifier",
    tag: "SIMPLIFIER",
    description: "Reviews code changes from the current cycle and simplifies for clarity — removes unnecessary wrappers, dead code, and over-abstraction without changing behavior.",
    hex: "#A78BFA",
    gradientEnd: "#8B5CF6",
    text: "text-agent-simplifier",
    bg: "bg-agent-simplifier",
    bgDim: "bg-agent-simplifier/10",
    bgBadge: "bg-agent-simplifier/20",
    border: "border-agent-simplifier",
    gradientFrom: "from-agent-simplifier/[0.03]",
    glow: "shadow-[0_0_8px_rgba(167,139,250,0.5)]",
    icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
  },
};

const FALLBACK_VISUAL: AgentVisual = {
  label: "Agent",
  tag: "AGENT",
  description: "An agent in the pipeline.",
  hex: "#90A4AE",
  gradientEnd: "#78909C",
  text: "text-text-muted",
  bg: "bg-text-muted",
  bgDim: "bg-overlay",
  bgBadge: "bg-overlay",
  border: "border-text-muted",
  gradientFrom: "from-transparent",
  glow: "",
  icon: "",
};

export function getAgentVisual(role: string): AgentVisual {
  return AGENT_VISUALS[role as AgentRole] ?? FALLBACK_VISUAL;
}

/** Convert hex color to "R, G, B" string for use in rgba() */
export function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
