import type {
  Award,
  AwardRarity,
  Task,
  AgentRole,
} from "@/lib/types";
import {
  AWARD_RARITIES,
  AWARD_SOURCES,
  TASK_STATUSES,
  SEVERITIES,
  AGENT_ROLES,
} from "@/lib/types";
import type { MetricsSnapshot } from "@/lib/otel/metrics";

// ─── In-memory award store ───────────────────────────────────────────────────

const earnedAwards: Award[] = [];
const earnedIds = new Set<string>();

export function getAwards(): Award[] {
  return [...earnedAwards];
}

export function addAward(award: Award): boolean {
  if (earnedIds.has(award.id)) return false;
  earnedIds.add(award.id);
  earnedAwards.push(award);
  return true;
}

export function clearAwards(): void {
  earnedAwards.length = 0;
  earnedIds.clear();
}

// ─── Rarity colors ───────────────────────────────────────────────────────────

const RARITY_COLORS: Record<AwardRarity, string> = {
  [AWARD_RARITIES.COMMON]: "#90A4AE",
  [AWARD_RARITIES.UNCOMMON]: "#00FFA3",
  [AWARD_RARITIES.RARE]: "#00E5FF",
  [AWARD_RARITIES.EPIC]: "#B026FF",
  [AWARD_RARITIES.LEGENDARY]: "#FFB800",
};

// ─── Predefined award definitions ────────────────────────────────────────────

interface AwardRule {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: AwardRarity;
  color: string;
  agent?: AgentRole;
  trigger: string;
  check: (ctx: EvalContext) => boolean;
}

interface EvalContext {
  tasks: Task[];
  metrics: MetricsSnapshot;
}

const PREDEFINED_AWARDS: AwardRule[] = [
  // ── Task milestones ──
  {
    id: "first-blood",
    title: "First Blood",
    description: "First task discovered by the Explorer",
    icon: "🔍",
    rarity: AWARD_RARITIES.COMMON,
    color: RARITY_COLORS[AWARD_RARITIES.COMMON],
    agent: AGENT_ROLES.EXPLORER,
    trigger: "tasks.created >= 1",
    check: ({ tasks }) => tasks.length >= 1,
  },
  {
    id: "first-fix",
    title: "Bug Squasher",
    description: "First task resolved — the Fixer is warmed up",
    icon: "🔧",
    rarity: AWARD_RARITIES.COMMON,
    color: RARITY_COLORS[AWARD_RARITIES.COMMON],
    agent: AGENT_ROLES.FIXER,
    trigger: "tasks.resolved >= 1",
    check: ({ tasks }) =>
      tasks.some((t) => t.status === TASK_STATUSES.RESOLVED),
  },
  {
    id: "five-down",
    title: "Five Down",
    description: "5 tasks resolved — on a roll!",
    icon: "✋",
    rarity: AWARD_RARITIES.UNCOMMON,
    color: RARITY_COLORS[AWARD_RARITIES.UNCOMMON],
    trigger: "tasks.resolved >= 5",
    check: ({ tasks }) =>
      tasks.filter((t) => t.status === TASK_STATUSES.RESOLVED).length >= 5,
  },
  {
    id: "double-digits",
    title: "Double Digits",
    description: "10 tasks resolved — unstoppable",
    icon: "🔟",
    rarity: AWARD_RARITIES.RARE,
    color: RARITY_COLORS[AWARD_RARITIES.RARE],
    trigger: "tasks.resolved >= 10",
    check: ({ tasks }) =>
      tasks.filter((t) => t.status === TASK_STATUSES.RESOLVED).length >= 10,
  },
  {
    id: "clean-sweep",
    title: "Clean Sweep",
    description: "All tasks resolved — zero open issues",
    icon: "🧹",
    rarity: AWARD_RARITIES.EPIC,
    color: RARITY_COLORS[AWARD_RARITIES.EPIC],
    trigger: "tasks.open === 0 && tasks.total > 0",
    check: ({ tasks }) =>
      tasks.length > 0 &&
      tasks.every(
        (t) =>
          t.status === TASK_STATUSES.RESOLVED ||
          t.status === TASK_STATUSES.WONT_FIX ||
          t.status === TASK_STATUSES.DEFERRED,
      ),
  },
  {
    id: "critical-slayer",
    title: "Critical Slayer",
    description: "All CRITICAL issues resolved",
    icon: "⚔️",
    rarity: AWARD_RARITIES.EPIC,
    color: RARITY_COLORS[AWARD_RARITIES.EPIC],
    trigger: "zero open criticals",
    check: ({ tasks }) =>
      tasks.some((t) => t.severity === SEVERITIES.CRITICAL) &&
      tasks
        .filter((t) => t.severity === SEVERITIES.CRITICAL)
        .every(
          (t) =>
            t.status === TASK_STATUSES.RESOLVED ||
            t.status === TASK_STATUSES.WONT_FIX,
        ),
  },
  {
    id: "bug-magnet",
    title: "Bug Magnet",
    description: "20+ tasks discovered — this codebase is spicy",
    icon: "🧲",
    rarity: AWARD_RARITIES.UNCOMMON,
    color: "#F97316",
    trigger: "tasks.total >= 20",
    check: ({ tasks }) => tasks.length >= 20,
  },

  // ── Build milestones ──
  {
    id: "green-machine",
    title: "Green Machine",
    description: "First successful build after a fix",
    icon: "✅",
    rarity: AWARD_RARITIES.COMMON,
    color: RARITY_COLORS[AWARD_RARITIES.COMMON],
    agent: AGENT_ROLES.FIXER,
    trigger: "builds.pass >= 1",
    check: ({ metrics }) => (metrics.buildsPass ?? 0) >= 1,
  },
  {
    id: "build-streak-5",
    title: "On Fire",
    description: "5 build passes in a row (estimated from high ratio)",
    icon: "🔥",
    rarity: AWARD_RARITIES.UNCOMMON,
    color: RARITY_COLORS[AWARD_RARITIES.UNCOMMON],
    agent: AGENT_ROLES.FIXER,
    trigger: "builds.pass >= 5",
    check: ({ metrics }) => (metrics.buildsPass ?? 0) >= 5,
  },
  {
    id: "build-streak-10",
    title: "Unstoppable Builder",
    description: "10 successful builds — the Fixer is in the zone",
    icon: "🏗️",
    rarity: AWARD_RARITIES.RARE,
    color: RARITY_COLORS[AWARD_RARITIES.RARE],
    agent: AGENT_ROLES.FIXER,
    trigger: "builds.pass >= 10",
    check: ({ metrics }) => (metrics.buildsPass ?? 0) >= 10,
  },
  {
    id: "perfect-builds",
    title: "Perfect Record",
    description: "100% build pass rate with 5+ builds — flawless execution",
    icon: "💎",
    rarity: AWARD_RARITIES.LEGENDARY,
    color: RARITY_COLORS[AWARD_RARITIES.LEGENDARY],
    trigger: "builds.fail === 0 && builds.pass >= 5",
    check: ({ metrics }) =>
      (metrics.buildsPass ?? 0) >= 5 && (metrics.buildsFail ?? 0) === 0,
  },
  {
    id: "first-failure",
    title: "Learning Experience",
    description: "First build failure — even the best stumble",
    icon: "💥",
    rarity: AWARD_RARITIES.COMMON,
    color: "#EF4444",
    agent: AGENT_ROLES.FIXER,
    trigger: "builds.fail >= 1",
    check: ({ metrics }) => (metrics.buildsFail ?? 0) >= 1,
  },

  // ── Cycle milestones ──
  {
    id: "first-loop",
    title: "First Loop",
    description: "Completed the first pipeline cycle",
    icon: "🔄",
    rarity: AWARD_RARITIES.COMMON,
    color: RARITY_COLORS[AWARD_RARITIES.COMMON],
    trigger: "cycles >= 1",
    check: ({ metrics }) => (metrics.cyclesCompleted ?? 0) >= 1,
  },
  {
    id: "five-cycles",
    title: "Getting Serious",
    description: "5 cycles completed — deep iteration mode",
    icon: "🎯",
    rarity: AWARD_RARITIES.UNCOMMON,
    color: RARITY_COLORS[AWARD_RARITIES.UNCOMMON],
    trigger: "cycles >= 5",
    check: ({ metrics }) => (metrics.cyclesCompleted ?? 0) >= 5,
  },
  {
    id: "marathon-runner",
    title: "Marathon Runner",
    description: "10+ cycles — in it for the long haul",
    icon: "🏃",
    rarity: AWARD_RARITIES.RARE,
    color: RARITY_COLORS[AWARD_RARITIES.RARE],
    trigger: "cycles >= 10",
    check: ({ metrics }) => (metrics.cyclesCompleted ?? 0) >= 10,
  },

  // ── Token milestones ──
  {
    id: "chatty-agents",
    title: "Chatty Agents",
    description: "100K+ total tokens consumed — agents love to talk",
    icon: "💬",
    rarity: AWARD_RARITIES.UNCOMMON,
    color: RARITY_COLORS[AWARD_RARITIES.UNCOMMON],
    trigger: "total tokens >= 100K",
    check: ({ metrics }) => {
      const inp = metrics.agentInputTokens ?? {};
      const out = metrics.agentOutputTokens ?? {};
      let total = 0;
      for (const r of Object.keys(inp)) total += inp[r] ?? 0;
      for (const r of Object.keys(out)) total += out[r] ?? 0;
      return total >= 100_000;
    },
  },
  {
    id: "million-tokens",
    title: "Token Millionaire",
    description: "1M+ tokens consumed — running up the tab!",
    icon: "💰",
    rarity: AWARD_RARITIES.EPIC,
    color: RARITY_COLORS[AWARD_RARITIES.EPIC],
    trigger: "total tokens >= 1M",
    check: ({ metrics }) => {
      const inp = metrics.agentInputTokens ?? {};
      const out = metrics.agentOutputTokens ?? {};
      let total = 0;
      for (const r of Object.keys(inp)) total += inp[r] ?? 0;
      for (const r of Object.keys(out)) total += out[r] ?? 0;
      return total >= 1_000_000;
    },
  },

  // ── Tool milestones ──
  {
    id: "tool-user",
    title: "Tool Time",
    description: "50+ tool invocations — agents are busy",
    icon: "🛠️",
    rarity: AWARD_RARITIES.UNCOMMON,
    color: RARITY_COLORS[AWARD_RARITIES.UNCOMMON],
    trigger: "tool calls >= 50",
    check: ({ metrics }) => {
      const tools = metrics.toolInvocations ?? {};
      return Object.values(tools).reduce((s, v) => s + v, 0) >= 50;
    },
  },
  {
    id: "power-tools",
    title: "Power Tools",
    description: "200+ tool invocations — serious automation",
    icon: "⚡",
    rarity: AWARD_RARITIES.RARE,
    color: RARITY_COLORS[AWARD_RARITIES.RARE],
    trigger: "tool calls >= 200",
    check: ({ metrics }) => {
      const tools = metrics.toolInvocations ?? {};
      return Object.values(tools).reduce((s, v) => s + v, 0) >= 200;
    },
  },

  // ── Compaction milestones ──
  {
    id: "first-compaction",
    title: "Memory Wipe",
    description: "First context compaction — the buffer was getting full",
    icon: "🧠",
    rarity: AWARD_RARITIES.COMMON,
    color: RARITY_COLORS[AWARD_RARITIES.COMMON],
    trigger: "compactions >= 1",
    check: ({ metrics }) => (metrics.compactions ?? 0) >= 1,
  },
  {
    id: "compaction-veteran",
    title: "Compaction Veteran",
    description: "5+ compactions — context management pro",
    icon: "🗜️",
    rarity: AWARD_RARITIES.UNCOMMON,
    color: RARITY_COLORS[AWARD_RARITIES.UNCOMMON],
    trigger: "compactions >= 5",
    check: ({ metrics }) => (metrics.compactions ?? 0) >= 5,
  },

  // ── Agent-specific fun ──
  {
    id: "explorer-mvp",
    title: "Eagle Eye",
    description: "Explorer has the most turns — thorough investigation",
    icon: "🦅",
    rarity: AWARD_RARITIES.UNCOMMON,
    color: "#00E5FF",
    agent: AGENT_ROLES.EXPLORER,
    trigger: "explorer has most turns",
    check: ({ metrics }) => {
      const turns = metrics.agentTurns ?? {};
      const explorerTurns = turns[AGENT_ROLES.EXPLORER] ?? 0;
      if (explorerTurns < 3) return false;
      return Object.entries(turns).every(
        ([role, t]) =>
          role === AGENT_ROLES.EXPLORER || (t ?? 0) <= explorerTurns,
      );
    },
  },
  {
    id: "fixer-mvp",
    title: "Fix Machine",
    description: "Fixer has the most turns — relentless repairs",
    icon: "🤖",
    rarity: AWARD_RARITIES.UNCOMMON,
    color: "#00FFA3",
    agent: AGENT_ROLES.FIXER,
    trigger: "fixer has most turns",
    check: ({ metrics }) => {
      const turns = metrics.agentTurns ?? {};
      const fixerTurns = turns[AGENT_ROLES.FIXER] ?? 0;
      if (fixerTurns < 3) return false;
      return Object.entries(turns).every(
        ([role, t]) =>
          role === AGENT_ROLES.FIXER || (t ?? 0) <= fixerTurns,
      );
    },
  },
];

// ─── Evaluate predefined awards ──────────────────────────────────────────────

export function evaluateAwards(
  tasks: Task[],
  metrics: MetricsSnapshot,
): Award[] {
  const newAwards: Award[] = [];
  const ctx: EvalContext = { tasks, metrics };

  for (const rule of PREDEFINED_AWARDS) {
    if (earnedIds.has(rule.id)) continue;
    if (rule.check(ctx)) {
      const award: Award = {
        id: rule.id,
        title: rule.title,
        description: rule.description,
        icon: rule.icon,
        rarity: rule.rarity,
        source: AWARD_SOURCES.PREDEFINED,
        earnedAt: new Date().toISOString(),
        color: rule.color,
        agent: rule.agent,
        trigger: rule.trigger,
      };
      if (addAward(award)) {
        newAwards.push(award);
      }
    }
  }

  return newAwards;
}

// ─── AI-generated award builder prompt ───────────────────────────────────────

export function buildAwardGeneratorPrompt(
  tasks: Task[],
  metrics: MetricsSnapshot,
  existingAwardIds: string[],
): string {
  const taskSummary = {
    total: tasks.length,
    resolved: tasks.filter((t) => t.status === TASK_STATUSES.RESOLVED).length,
    open: tasks.filter(
      (t) =>
        t.status === TASK_STATUSES.OPEN ||
        t.status === TASK_STATUSES.IN_PROGRESS,
    ).length,
    critical: tasks.filter((t) => t.severity === SEVERITIES.CRITICAL).length,
    high: tasks.filter((t) => t.severity === SEVERITIES.HIGH).length,
    components: [...new Set(tasks.map((t) => t.component))].map((c) => c.replace(/["'`\\]/g, "")),
  };

  const totalTokens = (() => {
    const inp = metrics.agentInputTokens ?? {};
    const out = metrics.agentOutputTokens ?? {};
    let sum = 0;
    for (const r of Object.keys(inp)) sum += inp[r] ?? 0;
    for (const r of Object.keys(out)) sum += out[r] ?? 0;
    return sum;
  })();

  const toolCallTotal = metrics.toolInvocations
    ? Object.values(metrics.toolInvocations).reduce((s, v) => s + v, 0)
    : 0;

  return `You are the Award Ceremony Host for an autonomous AI development pipeline.
Your job is to analyze the pipeline's activity and create 1-3 UNIQUE, creative, funny awards.

## Current Pipeline State

**Tasks:** ${taskSummary.total} total, ${taskSummary.resolved} resolved, ${taskSummary.open} open, ${taskSummary.critical} critical, ${taskSummary.high} high
**Components touched:** ${taskSummary.components.join(", ") || "none yet"}
**Cycles completed:** ${metrics.cyclesCompleted}
**Builds:** ${metrics.buildsPass} pass / ${metrics.buildsFail} fail
**Total tokens consumed:** ${totalTokens.toLocaleString()}
**Tool invocations:** ${toolCallTotal}
**Compactions:** ${metrics.compactions}
**Agent turns:** ${JSON.stringify(metrics.agentTurns)}

**Already awarded IDs (do NOT repeat):** ${existingAwardIds.join(", ") || "none"}

## Rules
1. Each award must be FUNNY, CREATIVE, and based on the actual data above.
2. Use puns, pop culture references, nerd humor, programming jokes.
3. Each award needs a single emoji icon, a short punchy title (2-4 words), and a witty one-sentence description.
4. Assign a rarity: "common" (boring stat), "uncommon" (notable), "rare" (impressive), "epic" (remarkable), "legendary" (once-in-a-lifetime).
5. Assign a hex color that matches the vibe.
6. Generate a unique ID (lowercase-kebab-case, like "speed-demon" or "token-whale").
7. If there's not enough interesting data for an award, return fewer or zero awards.

## Response Format
Respond with ONLY a JSON array. No markdown, no explanation.
\`\`\`
[
  {
    "id": "unique-kebab-id",
    "title": "Punchy Title",
    "description": "Witty one-liner about the achievement",
    "icon": "🎭",
    "rarity": "rare",
    "color": "#00E5FF",
    "trigger": "what caused this award"
  }
]
\`\`\``;
}
