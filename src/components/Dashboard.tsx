"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type {
  PipelineConfig,
  PipelineState,
  Task,
  AgentRole,
} from "@/lib/types";
import {
  PIPELINE_STATUSES,
  SESSION_EVENT_TYPES,
} from "@/lib/types";
import { useSSE } from "@/hooks/useSSE";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WorkflowGraph } from "@/components/WorkflowGraph";
import { AgentStream } from "@/components/AgentStream";
import { SteeringBar } from "@/components/SteeringBar";
import { TaskList } from "@/components/TaskList";
import { TaskDetail } from "@/components/TaskDetail";
import { UxScorecard } from "@/components/UxScorecard";
import { MetricsBar } from "@/components/MetricsBar";
import { ContextMeter } from "@/components/ContextMeter";
import { SettingsPanel } from "@/components/SettingsPanel";
import { CelebrationEffects } from "@/components/CelebrationEffects";
import { GitPanel } from "@/components/GitPanel";
import { TokenUsageDisplay } from "@/components/TokenUsageDisplay";
import { AwardsPanel } from "@/components/AwardsPanel";

// ─── Stream entry type (UI-only) ──────────────────────────────────────────────

export interface StreamEntry {
  id: string;
  agent: AgentRole | null;
  type:
    | "message"
    | "tool-start"
    | "tool-complete"
    | "reasoning"
    | "error"
    | "system";
  content: string;
  timestamp: string;
  toolName?: string;
  toolArgs?: string;
  toolResult?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_STATE: PipelineState = {
  status: PIPELINE_STATUSES.IDLE,
  currentCycle: 0,
  activeAgent: null,
  runId: null,
  tasksSummary: { total: 0, open: 0, inProgress: 0, resolved: 0, deferred: 0 },
};

const SIDEBAR_TABS = ["tasks", "ux", "metrics", "awards"] as const;
type SidebarTab = (typeof SIDEBAR_TABS)[number];

const TAB_LABELS: Record<SidebarTab, string> = {
  tasks: "Tasks",
  ux: "UX",
  metrics: "Metrics",
  awards: "Awards",
};

const STATUS_COLORS: Record<string, string> = {
  running: "bg-status-live",
  paused: "bg-status-paused",
  error: "bg-status-error",
  idle: "bg-status-idle",
  stopped: "bg-status-idle",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface DashboardProps {
  config: PipelineConfig;
}

export function Dashboard({ config }: DashboardProps) {
  const router = useRouter();
  const [pipelineState, setPipelineState] =
    useState<PipelineState>(INITIAL_STATE);
  const [streamEntries, setStreamEntries] = useState<StreamEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<SidebarTab>("tasks");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contextUsage, setContextUsage] = useState(0);
  const [isCompacting, setIsCompacting] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(config);
  const [gitOpen, setGitOpen] = useState(false);
  const [pipelineAction, setPipelineAction] = useState<"starting" | "stopping" | null>(null);
  const [showNewProjectConfirm, setShowNewProjectConfirm] = useState(false);

  const entryCounter = useRef(0);
  // Track the current accumulating message/reasoning entry so deltas merge into one block
  const activeMessageId = useRef<string | null>(null);
  const activeReasoningId = useRef<string | null>(null);

  const { events, connectionStatus, acknowledge } = useSSE("/api/pipeline/stream");

  // ── Process SSE events ──────────────────────────────────────────────────────
  // Track how many events we've already processed to avoid re-processing
  // the same events across React re-renders while acknowledge is pending.
  const processedCount = useRef(0);

  useEffect(() => {
    if (events.length === 0) {
      processedCount.current = 0;
      return;
    }

    // Only process events we haven't seen yet
    const unprocessed = events.slice(processedCount.current);
    if (unprocessed.length === 0) return;

    const batch: StreamEntry[] = [];

    for (const evt of unprocessed) {
      switch (evt.type) {
        case SESSION_EVENT_TYPES.PIPELINE_STATE_CHANGE: {
          const state = evt.data.state as PipelineState | undefined;
          if (state) setPipelineState(state);
          break;
        }
        case SESSION_EVENT_TYPES.AGENT_START: {
          activeMessageId.current = null;
          activeReasoningId.current = null;
          batch.push({
            id: `se-${entryCounter.current++}`,
            agent: (evt.agent ?? evt.data.agent) as AgentRole | null,
            type: "system",
            content: `${String(evt.data.agent ?? evt.agent ?? "agent")} started`,
            timestamp: evt.timestamp,
          });
          break;
        }
        case SESSION_EVENT_TYPES.ASSISTANT_MESSAGE_DELTA: {
          const delta = String(evt.data.deltaContent ?? evt.data.delta ?? evt.data.content ?? "");
          if (!delta) break;
          // Try to append to the last message entry in this batch
          if (activeMessageId.current) {
            const existingIdx = batch.findIndex((e) => e.id === activeMessageId.current);
            if (existingIdx !== -1) {
              batch[existingIdx] = { ...batch[existingIdx], content: batch[existingIdx].content + delta };
              break;
            }
          }
          // Start new message block
          const id = `se-${entryCounter.current++}`;
          activeMessageId.current = id;
          activeReasoningId.current = null;
          batch.push({
            id,
            agent: (evt.agent ?? null) as AgentRole | null,
            type: "message",
            content: delta,
            timestamp: evt.timestamp,
          });
          break;
        }
        case SESSION_EVENT_TYPES.ASSISTANT_MESSAGE: {
          activeMessageId.current = null;
          const content = String(evt.data.content ?? "");
          if (content) {
            batch.push({
              id: `se-${entryCounter.current++}`,
              agent: (evt.agent ?? null) as AgentRole | null,
              type: "message",
              content,
              timestamp: evt.timestamp,
            });
          }
          break;
        }
        case SESSION_EVENT_TYPES.TOOL_EXECUTION_START: {
          activeMessageId.current = null;
          activeReasoningId.current = null;
          batch.push({
            id: `se-${entryCounter.current++}`,
            agent: (evt.agent ?? null) as AgentRole | null,
            type: "tool-start",
            content: `Calling ${String(evt.data.toolName ?? "tool")}`,
            timestamp: evt.timestamp,
            toolName: String(evt.data.toolName ?? ""),
            toolArgs: evt.data.arguments
              ? JSON.stringify(evt.data.arguments, null, 2)
              : undefined,
          });
          break;
        }
        case SESSION_EVENT_TYPES.TOOL_EXECUTION_COMPLETE: {
          batch.push({
            id: `se-${entryCounter.current++}`,
            agent: (evt.agent ?? null) as AgentRole | null,
            type: "tool-complete",
            content: `${String(evt.data.toolName ?? evt.data.toolCallId ?? "tool")} completed`,
            timestamp: evt.timestamp,
            toolName: String(evt.data.toolName ?? evt.data.toolCallId ?? ""),
            toolResult: evt.data.result
              ? JSON.stringify(evt.data.result, null, 2)
              : undefined,
          });
          break;
        }
        case SESSION_EVENT_TYPES.ASSISTANT_REASONING_DELTA: {
          const rDelta = String(evt.data.deltaContent ?? evt.data.delta ?? evt.data.content ?? "");
          if (!rDelta) break;
          if (activeReasoningId.current) {
            const existingIdx = batch.findIndex((e) => e.id === activeReasoningId.current);
            if (existingIdx !== -1) {
              batch[existingIdx] = { ...batch[existingIdx], content: batch[existingIdx].content + rDelta };
              break;
            }
          }
          const rId = `se-${entryCounter.current++}`;
          activeReasoningId.current = rId;
          batch.push({
            id: rId,
            agent: (evt.agent ?? null) as AgentRole | null,
            type: "reasoning",
            content: rDelta,
            timestamp: evt.timestamp,
          });
          break;
        }
        case SESSION_EVENT_TYPES.ASSISTANT_REASONING: {
          activeReasoningId.current = null;
          const rContent = String(evt.data.content ?? evt.data.reasoning ?? "");
          if (rContent) {
            batch.push({
              id: `se-${entryCounter.current++}`,
              agent: (evt.agent ?? null) as AgentRole | null,
              type: "reasoning",
              content: rContent,
              timestamp: evt.timestamp,
            });
          }
          break;
        }
        case SESSION_EVENT_TYPES.SESSION_COMPACTION_START:
          setIsCompacting(true);
          break;
        case SESSION_EVENT_TYPES.SESSION_COMPACTION_COMPLETE: {
          setIsCompacting(false);
          // Compute context usage from SDK's pre/post compaction token counts
          const preTokens = evt.data.preCompactionTokens as number | undefined;
          const postTokens = evt.data.postCompactionTokens as number | undefined;
          if (preTokens && postTokens && preTokens > 0) {
            setContextUsage(postTokens / preTokens);
          }
          break;
        }
        case SESSION_EVENT_TYPES.SESSION_ERROR: {
          batch.push({
            id: `se-${entryCounter.current++}`,
            agent: (evt.agent ?? null) as AgentRole | null,
            type: "error",
            content: String(evt.data.message ?? evt.data.error ?? "Error"),
            timestamp: evt.timestamp,
          });
          break;
        }
      }
    }

    // Mark events as processed and acknowledge for cleanup
    processedCount.current = events.length;
    acknowledge(unprocessed.length);

    // Merge batch into stream entries (single state update, no findIndex across prev)
    if (batch.length > 0) {
      setStreamEntries((prev) => {
        // If the first batch entry matches the last prev entry ID (delta continuation
        // from a previous render cycle), merge their content
        let merged = prev;
        let batchStart = 0;
        if (batch.length > 0 && prev.length > 0 && activeMessageId.current) {
          const lastPrev = prev[prev.length - 1];
          if (lastPrev.id === activeMessageId.current && batch[0].id === activeMessageId.current) {
            // Merge first batch item into last prev item
            merged = [...prev.slice(0, -1), { ...lastPrev, content: lastPrev.content + batch[0].content }];
            batchStart = 1;
          }
        }
        const combined = [...merged, ...batch.slice(batchStart)];
        return combined.length > 1000 ? combined.slice(-800) : combined;
      });
    }
  }, [events, acknowledge]);

  // ── Poll tasks ──────────────────────────────────────────────────────────────

  const fetchTasks = useCallback(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data: { tasks: Task[] }) => {
        if (data.tasks) setTasks(data.tasks);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // ── Status label ────────────────────────────────────────────────────────────

  const statusLabel =
    pipelineState.status === PIPELINE_STATUSES.RUNNING
      ? "LIVE"
      : pipelineState.status.toUpperCase();

  const isRunning = pipelineState.status === PIPELINE_STATUSES.RUNNING;
  const canStart = !isRunning && pipelineAction !== "starting";

  const startPipeline = useCallback(async () => {
    setPipelineAction("starting");
    try {
      await fetch("/api/pipeline/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentConfig),
      });
    } catch { /* handled via SSE state */ }
    finally { setPipelineAction(null); }
  }, [currentConfig]);

  const stopPipeline = useCallback(async () => {
    setPipelineAction("stopping");
    try {
      const res = await fetch("/api/pipeline/stop", { method: "POST" });
      if (res.ok) {
        // Optimistically update — don't wait for SSE round-trip
        setPipelineState((prev) => ({
          ...prev,
          status: PIPELINE_STATUSES.STOPPED,
          activeAgent: null,
        }));
      }
    } catch { /* handled via SSE state */ }
    finally { setPipelineAction(null); }
  }, []);

  const resetPipeline = useCallback(() => {
    setStreamEntries([]);
    entryCounter.current = 0;
    activeMessageId.current = null;
    activeReasoningId.current = null;
    setPipelineState(INITIAL_STATE);
  }, []);

  const handleSteered = useCallback((text: string) => {
    setStreamEntries((prev) => [
      ...prev,
      {
        id: `se-${entryCounter.current++}`,
        agent: pipelineState.activeAgent,
        type: "system" as const,
        content: `[YOU] ${text}`,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, [pipelineState.activeAgent]);

  return (
    <div className="noise relative flex h-screen flex-col overflow-hidden bg-void">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="glass-panel relative z-10 flex h-14 shrink-0 items-center justify-between border-t-0 border-x-0 px-5 shadow-elevation-2">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold uppercase tracking-[0.15em] text-accent">
            Endstate
          </h1>
          <span className="text-xs text-text-muted">
            {currentConfig.projectPath.split(/[\\/]/).pop()}
          </span>
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 font-mono text-[10px] text-accent shadow-[0_0_12px_rgba(0,229,255,0.1)]">
            {currentConfig.model}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <ContextMeter
            usage={contextUsage}
            isCompacting={isCompacting}
          />

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-text-muted">
              Cycle
            </span>
            <span className="font-mono text-sm font-bold text-text-primary">
              {pipelineState.currentCycle}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {pipelineState.status === PIPELINE_STATUSES.RUNNING ? (
              <motion.span
                animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="h-2 w-2 rounded-full bg-status-live shadow-[0_0_8px_rgba(0,255,163,0.6)]"
              />
            ) : (
              <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[pipelineState.status] ?? "bg-status-idle"}`} />
            )}
            <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
              {statusLabel}
            </span>
          </div>

          {connectionStatus !== "connected" && (
            <span className="rounded-full bg-severity-critical/10 px-2 py-0.5 text-[10px] font-medium text-severity-critical">
              {connectionStatus === "error" ? "DISCONNECTED" : "RECONNECTING"}
            </span>
          )}

          {/* Pipeline Start / Stop / Resume / New (2026 §4 — spring physics, glow hover) */}
          {isRunning ? (
            <motion.button
              whileHover={{ scale: 1.06, boxShadow: "0 0 20px rgba(239, 68, 68, 0.25)" }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onClick={stopPipeline}
              disabled={pipelineAction === "stopping"}
              className="flex items-center gap-1.5 rounded-full border border-severity-critical/20 bg-severity-critical/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-severity-critical transition-colors hover:bg-severity-critical/20 disabled:opacity-40"
              aria-label="Stop pipeline"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              {pipelineAction === "stopping" ? (
                <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }}>
                  Stopping…
                </motion.span>
              ) : "Stop"}
            </motion.button>
          ) : pipelineState.status === PIPELINE_STATUSES.STOPPED && pipelineState.currentCycle > 0 ? (
            /* Stopped with history — show Resume + New Run */
            <div className="flex items-center gap-1.5">
              <motion.button
                whileHover={{ scale: 1.06, boxShadow: "0 0 20px rgba(0, 229, 255, 0.25)" }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                onClick={startPipeline}
                disabled={pipelineAction === "starting"}
                className="flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
                aria-label="Resume pipeline"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6,4 20,12 6,20" />
                </svg>
                Resume
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                onClick={() => { resetPipeline(); }}
                className="rounded-full border border-border-active bg-white/[0.03] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
                aria-label="New run"
              >
                New
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.06, boxShadow: "0 0 20px rgba(0, 255, 163, 0.25)" }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onClick={startPipeline}
              disabled={!canStart}
              className="flex items-center gap-1.5 rounded-full border border-status-live/20 bg-status-live/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-status-live transition-colors hover:bg-status-live/20 disabled:opacity-40"
              aria-label="Start pipeline"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6,4 20,12 6,20" />
              </svg>
              {pipelineAction === "starting" ? (
                <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }}>
                  Starting…
                </motion.span>
              ) : "Start"}
            </motion.button>
          )}

          {/* Git (2026 §5 — glassmorphic icon button) */}
          <motion.button
            onClick={() => setGitOpen(true)}
            whileHover={{ scale: 1.1, boxShadow: "0 0 12px rgba(0, 229, 255, 0.12)" }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="flex items-center gap-1.5 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/[0.04] hover:text-agent-explorer"
            aria-label="Git"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
          </motion.button>

          {/* New Project */}
          <motion.button
            onClick={() => setShowNewProjectConfirm(true)}
            whileHover={{ scale: 1.1, boxShadow: "0 0 12px rgba(255, 184, 0, 0.12)" }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="flex items-center gap-1.5 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/[0.04] hover:text-agent-ux"
            aria-label="New project"
            title="New project — return to setup wizard"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </motion.button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
            aria-label="Settings"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Workflow Graph ──────────────────────────────────────────────── */}
      <div className="relative z-10 shrink-0">
        <ErrorBoundary fallbackTitle="Workflow Graph Error">
          <WorkflowGraph
            activeAgent={pipelineState.activeAgent}
            cycle={pipelineState.currentCycle}
            status={pipelineState.status}
            agentGraph={currentConfig.agentGraph}
          />
        </ErrorBoundary>
      </div>

      {/* ── Token Usage ────────────────────────────────────────────────── */}
      <div className="relative z-10 shrink-0">
        <ErrorBoundary fallbackTitle="Token Usage Error">
          <TokenUsageDisplay activeAgent={pipelineState.activeAgent} isCompacting={isCompacting} />
        </ErrorBoundary>
      </div>

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-0 flex-1 gap-px">
        {/* Agent Stream */}
        <div className="flex-1 overflow-hidden">
          <ErrorBoundary fallbackTitle="Agent Stream Error">
            <AgentStream
              entries={streamEntries}
              activeAgent={pipelineState.activeAgent}
            />
          </ErrorBoundary>
        </div>

        {/* Sidebar */}
        <div className="flex w-[360px] shrink-0 flex-col overflow-hidden glass-panel border-t-0 border-b-0 border-r-0">
          {/* Tab bar */}
          <div className="flex shrink-0 border-b border-border-subtle" role="tablist">
            {SIDEBAR_TABS.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-center text-[10px] uppercase tracking-widest transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-accent text-accent"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {TAB_LABELS[tab]}
                {tab === "tasks" && tasks.length > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent/10 px-1 font-mono text-[9px] text-accent">
                    {tasks.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden" role="tabpanel">
            <ErrorBoundary fallbackTitle="Sidebar Error">
              {activeTab === "tasks" && (
                <TaskList
                  tasks={tasks}
                  onSelectTask={setSelectedTask}
                  onRefreshTasks={fetchTasks}
                />
              )}
              {activeTab === "ux" && <UxScorecard tasks={tasks} />}
              {activeTab === "metrics" && (
                <MetricsBar
                  pipelineState={pipelineState}
                  tasks={tasks}
                />
              )}
              {activeTab === "awards" && <AwardsPanel />}
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* ── Steering Bar ───────────────────────────────────────────────── */}
      <div className="relative z-10 shrink-0">
        <ErrorBoundary fallbackTitle="Steering Bar Error">
          <SteeringBar status={pipelineState.status} onSteered={handleSteered} />
        </ErrorBoundary>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsPanel
            config={currentConfig}
            onClose={() => setSettingsOpen(false)}
            onSave={(updated: PipelineConfig) => {
              setCurrentConfig(updated);
              setSettingsOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gitOpen && (
          <GitPanel onClose={() => setGitOpen(false)} />
        )}
      </AnimatePresence>

      {/* ── New Project Confirmation ───────────────────────────────────── */}
      <AnimatePresence>
        {showNewProjectConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowNewProjectConfirm(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="glass-panel w-full max-w-sm rounded-2xl p-6"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                New Project?
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                This will open the setup wizard. Completing it will overwrite
                the current project configuration. You can always come back
                without saving.
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowNewProjectConfirm(false)}
                  className="rounded-lg border border-border-subtle bg-void/50 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: "0 0 16px rgba(255, 184, 0, 0.2)" }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setShowNewProjectConfirm(false);
                    router.push("/setup");
                  }}
                  className="rounded-lg bg-agent-ux/10 border border-agent-ux/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-agent-ux transition-colors hover:bg-agent-ux/20"
                >
                  Continue to Setup
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Celebrations ───────────────────────────────────────────────── */}
      <CelebrationEffects
        tasks={tasks}
        events={events}
      />
    </div>
  );
}
