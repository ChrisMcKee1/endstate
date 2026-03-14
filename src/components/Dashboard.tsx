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
  PIPELINE_ACTIONS,
  PIPELINE_STATUSES,
  SESSION_EVENT_TYPES,
} from "@/lib/types";
import type { PipelineAction } from "@/lib/types";
import { useSSE } from "@/hooks/useSSE";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WorkflowGraph } from "@/components/WorkflowGraph";
import { AgentChatPanel } from "@/components/AgentChatPanel";
import { SteeringBar } from "@/components/SteeringBar";
import { TaskDetail } from "@/components/TaskDetail";
import { SettingsPanel } from "@/components/SettingsPanel";
import { CelebrationEffects } from "@/components/CelebrationEffects";
import { GitPanel } from "@/components/GitPanel";
import { TokenUsageDisplay } from "@/components/TokenUsageDisplay";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardSidebar, isSidebarTab } from "@/components/DashboardSidebar";
import type { SidebarTab } from "@/components/DashboardSidebar";
import { StartNewModal } from "@/components/StartNewModal";
import { ToastContainer } from "@/components/ToastContainer";

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
  activeAgents: [],
  activeDomains: [],
  completedAgents: [],
  runId: null,
  tasksSummary: { total: 0, open: 0, inProgress: 0, resolved: 0, deferred: 0 },
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
  const [activeTab, setActiveTab] = useState<SidebarTab>(() => {
    try {
      const saved = localStorage.getItem("endstate-sidebar-tab");
      if (saved && isSidebarTab(saved)) return saved;
    } catch { /* SSR */ }
    return "tasks";
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contextUsage, setContextUsage] = useState(0);
  const [isCompacting, setIsCompacting] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(config);
  const [gitOpen, setGitOpen] = useState(false);
  const [pipelineAction, setPipelineAction] = useState<PipelineAction | null>(null);
  const pipelineActionRef = useRef<PipelineAction | null>(null);
  useEffect(() => { pipelineActionRef.current = pipelineAction; }, [pipelineAction]);
  const [showNewProjectConfirm, setShowNewProjectConfirm] = useState(false);
  const [showStartNewModal, setShowStartNewModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentRole | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [completedAgents, setCompletedAgents] = useState<AgentRole[]>([]);

  const entryCounter = useRef(0);
  // Track the current accumulating message/reasoning entry so deltas merge into one block
  const activeMessageId = useRef<string | null>(null);
  const activeReasoningId = useRef<string | null>(null);

  const { events, connectionStatus, acknowledge, generation, reconnect } = useSSE("/api/pipeline/stream");

  // ── Process SSE events ──────────────────────────────────────────────────────
  // Track how many events we've already processed to avoid re-processing
  // the same events across React re-renders while acknowledge is pending.
  const processedCount = useRef(0);
  // Track the SSE generation so we reset processedCount when the events array
  // is replaced after an acknowledge+flush cycle (which shifts the array).
  const lastGeneration = useRef(0);

  useEffect(() => {
    if (events.length === 0) {
      processedCount.current = 0;
      return;
    }

    // When generation changes, the events array was rebuilt (acknowledged events
    // were removed). Reset our cursor so we process from the start of the new array.
    if (generation !== lastGeneration.current) {
      processedCount.current = 0;
      lastGeneration.current = generation;
    }

    // Safety: if processedCount somehow exceeds the array length, clamp it
    if (processedCount.current > events.length) {
      processedCount.current = 0;
    }

    // Only process events we haven't seen yet
    const unprocessed = events.slice(processedCount.current);
    if (unprocessed.length === 0) return;

    const batch: StreamEntry[] = [];

    for (const evt of unprocessed) {
      switch (evt.type) {
        case SESSION_EVENT_TYPES.PIPELINE_STATE_CHANGE: {
          const state = evt.data.state as PipelineState | undefined;
          if (state) {
            setPipelineState(state);
            // Sync completedAgents from server state (survives browser refresh)
            if (state.completedAgents?.length) {
              setCompletedAgents((prev) => {
                const merged = new Set([...prev, ...state.completedAgents]);
                return merged.size !== prev.length ? [...merged] : prev;
              });
            }
            // Clear the "starting" action once the pipeline confirms any active state
            if (pipelineActionRef.current === PIPELINE_ACTIONS.STARTING) {
              setPipelineAction(null);
            }
          }
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
        case SESSION_EVENT_TYPES.AGENT_END: {
          const endedAgent = (evt.agent ?? evt.data.agent) as AgentRole | null;
          if (endedAgent) {
            setCompletedAgents((prev) => prev.includes(endedAgent) ? prev : [...prev, endedAgent]);
          }
          const duration = evt.data.durationSeconds as number | undefined;
          batch.push({
            id: `se-${entryCounter.current++}`,
            agent: endedAgent,
            type: "system",
            content: `${String(evt.data.agent ?? evt.agent ?? "agent")} finished${duration ? ` (${duration.toFixed(1)}s)` : ""}`,
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
        case SESSION_EVENT_TYPES.SESSION_USAGE_INFO: {
          const tokenLimit = evt.data.tokenLimit as number | undefined;
          const currentTokens = evt.data.currentTokens as number | undefined;
          if (tokenLimit && tokenLimit > 0 && currentTokens !== undefined) {
            setContextUsage(currentTokens / tokenLimit);
          }
          break;
        }
        case SESSION_EVENT_TYPES.SESSION_SHUTDOWN: {
          // Session shutdown carries end-of-session metrics — logged for visibility
          const premiumReqs = evt.data.totalPremiumRequests as number | undefined;
          if (premiumReqs) {
            batch.push({
              id: `se-${entryCounter.current++}`,
              agent: (evt.agent ?? null) as AgentRole | null,
              type: "system",
              content: `Session complete: ${premiumReqs} premium requests`,
              timestamp: evt.timestamp,
            });
          }
          break;
        }
        case SESSION_EVENT_TYPES.PIPELINE_CYCLE_START: {
          setCompletedAgents([]);
          batch.push({
            id: `se-${entryCounter.current++}`,
            agent: null,
            type: "system",
            content: `── Cycle ${evt.data.cycle ?? ""} started ──`,
            timestamp: evt.timestamp,
          });
          break;
        }
        case SESSION_EVENT_TYPES.PIPELINE_CYCLE_END: {
          batch.push({
            id: `se-${entryCounter.current++}`,
            agent: null,
            type: "system",
            content: `── Cycle ${evt.data.cycle ?? ""} complete ──`,
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
        if (prev.length > 0 && activeMessageId.current) {
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
  }, [events, acknowledge, generation]);

  // ── Persist sidebar tab ─────────────────────────────────────────────────────

  useEffect(() => {
    try { localStorage.setItem("endstate-sidebar-tab", activeTab); } catch { /* SSR */ }
  }, [activeTab]);

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

  const isRunning = pipelineState.status === PIPELINE_STATUSES.RUNNING;

  const startPipeline = useCallback(async (options?: { resume?: boolean }) => {
    setPipelineAction(PIPELINE_ACTIONS.STARTING);
    setCompletedAgents([]);
    try {
      const res = await fetch("/api/pipeline/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...currentConfig, resume: options?.resume }),
      });
      if (!res.ok) setPipelineAction(null);
    } catch { setPipelineAction(null); }
    // On success, pipelineAction is cleared when SSE confirms RUNNING state
  }, [currentConfig]);

  const stopPipeline = useCallback(async () => {
    setPipelineAction(PIPELINE_ACTIONS.STOPPING);
    try {
      const res = await fetch("/api/pipeline/stop", { method: "POST" });
      if (res.ok) {
        // Optimistically update — don't wait for SSE round-trip
        setPipelineState((prev) => ({
          ...prev,
          status: PIPELINE_STATUSES.STOPPED,
          activeAgent: null,
          activeAgents: [],
        }));
      }
    } catch { /* handled via SSE state */ }
    finally { setPipelineAction(null); }
  }, []);

  // Reset helper for future use (e.g. starting a new pipeline)
  const _resetPipeline = useCallback(() => {
    setStreamEntries([]);
    entryCounter.current = 0;
    activeMessageId.current = null;
    activeReasoningId.current = null;
    setPipelineState(INITIAL_STATE);
    setCompletedAgents([]);
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

  const handleNewVision = useCallback(async (vision: string) => {
    const updatedConfig = { ...currentConfig, inspiration: vision };
    setCurrentConfig(updatedConfig);

    // Reset UI state for a fresh run
    setStreamEntries([]);
    entryCounter.current = 0;
    activeMessageId.current = null;
    activeReasoningId.current = null;
    setCompletedAgents([]);
    setTasks([]);
    setSelectedTask(null);
    setPipelineState(INITIAL_STATE);

    // Clear sessionStorage celebration badges so they don't persist
    try { sessionStorage.removeItem("endstate-celebrations-earned"); } catch { /* ignore */ }

    // Save updated config
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });
    } catch { /* best effort */ }

    // Log the new vision in stream
    setStreamEntries([{
      id: `se-${entryCounter.current++}`,
      agent: null,
      type: "system" as const,
      content: `── New vision: "${vision}" ──`,
      timestamp: new Date().toISOString(),
    }]);

    // Start the pipeline with the updated config
    setPipelineAction(PIPELINE_ACTIONS.STARTING);
    try {
      const res = await fetch("/api/pipeline/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });
      if (!res.ok) setPipelineAction(null);
    } catch { setPipelineAction(null); }
    // Safety timeout: clear spinner after 15s if SSE never confirms state change
    setTimeout(() => setPipelineAction((prev) => prev === PIPELINE_ACTIONS.STARTING ? null : prev), 15_000);
  }, [currentConfig]);

  const handleUpdateVision = useCallback(async (vision: string) => {
    const updatedConfig = { ...currentConfig, inspiration: vision };
    setCurrentConfig(updatedConfig);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });
    } catch { /* best effort */ }
  }, [currentConfig]);

  return (
    <>
      {/* Mobile gate — dashboard requires desktop viewport */}
      <div className="flex md:hidden h-screen items-center justify-center bg-void p-6 text-center">
        <div className="max-w-sm space-y-3">
          <div className="text-2xl">🖥️</div>
          <h2 className="text-text-primary font-medium">Desktop Required</h2>
          <p className="text-text-secondary text-sm">
            Endstate&apos;s pipeline dashboard is designed for desktop screens.
            Please use a device with at least 768px width.
          </p>
        </div>
      </div>

      <div id="main-content" className="noise relative hidden md:flex h-screen flex-col overflow-hidden bg-void">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <DashboardHeader
        pipelineState={pipelineState}
        currentConfig={currentConfig}
        completedAgents={completedAgents}
        pipelineAction={pipelineAction}
        connectionStatus={connectionStatus}
        contextUsage={contextUsage}
        isCompacting={isCompacting}
        onStartPipeline={startPipeline}
        onStopPipeline={stopPipeline}
        onReconnect={reconnect}
        onOpenGit={() => setGitOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onShowNewProjectConfirm={() => setShowNewProjectConfirm(true)}
        onShowStartNewModal={() => setShowStartNewModal(true)}
      />

      {/* ── Main Content: Graph (center) + Sidebar (collapsible right) ── */}
      <div className="relative z-10 flex min-h-0 flex-1 gap-px">
        {/* Workflow Graph - center stage */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <ErrorBoundary fallbackTitle="Workflow Graph Error">
            <WorkflowGraph
              activeAgent={pipelineState.activeAgent}
              activeAgents={pipelineState.activeAgents ?? []}
              activeDomains={pipelineState.activeDomains ?? []}
              cycle={pipelineState.currentCycle}
              status={pipelineState.status}
              completedAgents={completedAgents}
              agentGraph={currentConfig.agentGraph}
              onAgentClick={setSelectedAgent}
              selectedAgent={selectedAgent}
            />
          </ErrorBoundary>
        </div>

        {/* Sidebar toggle (visible below lg) */}
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="absolute right-0 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-l-lg bg-overlay/90 text-text-muted transition-colors hover:text-accent lg:hidden"
          aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          aria-expanded={sidebarOpen}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {sidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            )}
          </svg>
        </button>

        {/* Sidebar - collapsible on narrow, permanent on wide */}
        <div className={`flex shrink-0 flex-col overflow-hidden glass-panel border-t-0 border-b-0 border-r-0 transition-[width] duration-200 ease-in-out ${
          sidebarOpen ? "w-[300px] lg:w-[360px]" : "w-0 lg:w-[360px]"
        }`}>
          <DashboardSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tasks={tasks}
            pipelineState={pipelineState}
            currentConfig={currentConfig}
            isRunning={isRunning}
            onSelectTask={setSelectedTask}
            onRefreshTasks={fetchTasks}
            onUpdateVision={handleUpdateVision}
          />
        </div>
      </div>

      {/* ── Token Usage ────────────────────────────────────────────────── */}
      <div className="relative z-10 shrink-0">
        <ErrorBoundary fallbackTitle="Token Usage Error">
          <TokenUsageDisplay activeAgent={pipelineState.activeAgent} isCompacting={isCompacting} />
        </ErrorBoundary>
      </div>

      {/* ── Steering Bar ───────────────────────────────────────────────── */}
      <div className="relative z-10 shrink-0">
        <ErrorBoundary fallbackTitle="Steering Bar Error">
          <SteeringBar status={pipelineAction === PIPELINE_ACTIONS.STARTING ? PIPELINE_STATUSES.RUNNING : pipelineState.status} onSteered={handleSteered} onNewVision={handleNewVision} />
        </ErrorBoundary>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {/*
        Modals are used intentionally here for overlay panels (settings, task detail,
        agent chat, git). In a fixed-viewport dashboard, modals are appropriate because
        these are transient interactions that overlay the active workspace. The alternative
        (side panels) would require splitting the viewport further and losing focus on the
        primary workflow graph. Each modal uses proper focus trap, keyboard handling, and
        aria-modal from the Modal primitive component.
      */}
      <AnimatePresence>
        {selectedAgent && (
          <AgentChatPanel
            agent={selectedAgent}
            entries={streamEntries.filter((e) => e.agent === selectedAgent)}
            isActive={(pipelineState.activeAgents ?? []).includes(selectedAgent) || pipelineState.activeAgent === selectedAgent}
            isCompleted={completedAgents.includes(selectedAgent)}
            onClose={() => setSelectedAgent(null)}
          />
        )}
      </AnimatePresence>

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
            onKeyDown={(e) => {
              if (e.key === "Escape") setShowNewProjectConfirm(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="glass-panel w-full max-w-sm rounded-2xl p-6"
              role="dialog"
              aria-modal="true"
              aria-label="New project confirmation"
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

      {/* ── Start New Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showStartNewModal && (
          <StartNewModal
            tasks={tasks}
            onResume={() => {
              setShowStartNewModal(false);
              startPipeline({ resume: true });
            }}
            onNewVision={(vision) => {
              setShowStartNewModal(false);
              handleNewVision(vision);
            }}
            onClose={() => setShowStartNewModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Vision loading overlay ────────────────────────────────────── */}
      <AnimatePresence>
        {pipelineAction === PIPELINE_ACTIONS.STARTING && pipelineState.status !== PIPELINE_STATUSES.RUNNING && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-void/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="relative h-12 w-12">
                <div className="absolute inset-0 rounded-full border-2 border-border-subtle" />
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">
                Starting new vision
              </p>
              <p className="max-w-xs text-center text-[10px] text-text-muted">
                {currentConfig.inspiration.length > 80
                  ? currentConfig.inspiration.slice(0, 80) + "…"
                  : currentConfig.inspiration}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Celebrations ───────────────────────────────────────────────── */}
      <CelebrationEffects
        tasks={tasks}
        events={events}
      />

      {/* ── Toast notifications ────────────────────────────────────────── */}
      <ToastContainer />
    </div>
    </>
  );
}
