"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

const SIDEBAR_TABS = ["tasks", "ux", "metrics"] as const;
type SidebarTab = (typeof SIDEBAR_TABS)[number];

const TAB_LABELS: Record<SidebarTab, string> = {
  tasks: "Tasks",
  ux: "UX",
  metrics: "Metrics",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface DashboardProps {
  config: PipelineConfig;
}

export function Dashboard({ config }: DashboardProps) {
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

  const entryCounter = useRef(0);
  const lastProcessed = useRef(0);

  const { events, connectionStatus } = useSSE("/api/pipeline/stream");

  // ── Process SSE events ──────────────────────────────────────────────────────

  useEffect(() => {
    if (events.length <= lastProcessed.current) return;
    const newEvents = events.slice(lastProcessed.current);
    lastProcessed.current = events.length;

    const newEntries: StreamEntry[] = [];

    for (const evt of newEvents) {
      switch (evt.type) {
        case SESSION_EVENT_TYPES.PIPELINE_STATE_CHANGE: {
          const state = evt.data.state as PipelineState | undefined;
          if (state) setPipelineState(state);
          break;
        }
        case SESSION_EVENT_TYPES.AGENT_START: {
          newEntries.push({
            id: `se-${entryCounter.current++}`,
            agent: (evt.agent ?? evt.data.agent) as AgentRole | null,
            type: "system",
            content: `${String(evt.data.agent ?? evt.agent ?? "agent")} started`,
            timestamp: evt.timestamp,
          });
          break;
        }
        case SESSION_EVENT_TYPES.ASSISTANT_MESSAGE_DELTA: {
          newEntries.push({
            id: `se-${entryCounter.current++}`,
            agent: (evt.agent ?? null) as AgentRole | null,
            type: "message",
            content: String(evt.data.delta ?? evt.data.content ?? ""),
            timestamp: evt.timestamp,
          });
          break;
        }
        case SESSION_EVENT_TYPES.ASSISTANT_MESSAGE: {
          newEntries.push({
            id: `se-${entryCounter.current++}`,
            agent: (evt.agent ?? null) as AgentRole | null,
            type: "message",
            content: String(evt.data.content ?? ""),
            timestamp: evt.timestamp,
          });
          break;
        }
        case SESSION_EVENT_TYPES.TOOL_EXECUTION_START: {
          newEntries.push({
            id: `se-${entryCounter.current++}`,
            agent: (evt.agent ?? null) as AgentRole | null,
            type: "tool-start",
            content: `Calling ${String(evt.data.toolName ?? "tool")}`,
            timestamp: evt.timestamp,
            toolName: String(evt.data.toolName ?? ""),
            toolArgs: evt.data.args
              ? JSON.stringify(evt.data.args, null, 2)
              : undefined,
          });
          break;
        }
        case SESSION_EVENT_TYPES.TOOL_EXECUTION_COMPLETE: {
          newEntries.push({
            id: `se-${entryCounter.current++}`,
            agent: (evt.agent ?? null) as AgentRole | null,
            type: "tool-complete",
            content: `${String(evt.data.toolName ?? "tool")} completed`,
            timestamp: evt.timestamp,
            toolName: String(evt.data.toolName ?? ""),
            toolResult: evt.data.result
              ? JSON.stringify(evt.data.result, null, 2)
              : undefined,
          });
          break;
        }
        case SESSION_EVENT_TYPES.ASSISTANT_REASONING_DELTA:
        case SESSION_EVENT_TYPES.ASSISTANT_REASONING: {
          newEntries.push({
            id: `se-${entryCounter.current++}`,
            agent: (evt.agent ?? null) as AgentRole | null,
            type: "reasoning",
            content: String(
              evt.data.delta ?? evt.data.content ?? evt.data.reasoning ?? "",
            ),
            timestamp: evt.timestamp,
          });
          break;
        }
        case SESSION_EVENT_TYPES.SESSION_COMPACTION_START:
          setIsCompacting(true);
          break;
        case SESSION_EVENT_TYPES.SESSION_COMPACTION_COMPLETE: {
          setIsCompacting(false);
          const usage = evt.data.contextUsage as number | undefined;
          if (usage !== undefined) setContextUsage(usage);
          break;
        }
        case SESSION_EVENT_TYPES.SESSION_ERROR: {
          newEntries.push({
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

    if (newEntries.length > 0) {
      setStreamEntries((prev) => {
        const combined = [...prev, ...newEntries];
        return combined.length > 1000 ? combined.slice(-1000) : combined;
      });
    }
  }, [events]);

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

  const statusColor: Record<string, string> = {
    running: "bg-status-live",
    paused: "bg-status-paused",
    error: "bg-status-error",
    idle: "bg-status-idle",
    stopped: "bg-status-idle",
  };

  const statusLabel =
    pipelineState.status === PIPELINE_STATUSES.RUNNING
      ? "LIVE"
      : pipelineState.status.toUpperCase();

  return (
    <div className="noise relative flex h-screen flex-col overflow-hidden bg-void">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex h-12 shrink-0 items-center justify-between border-b border-border-subtle bg-surface/80 px-4 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <h1 className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.15em] text-accent">
            Agentic
          </h1>
          <span className="text-xs text-text-muted">
            {currentConfig.projectPath.split(/[\\/]/).pop()}
          </span>
          <span className="rounded border border-border-subtle bg-elevated px-2 py-0.5 font-[family-name:var(--font-code)] text-[10px] text-text-secondary">
            {currentConfig.model}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ContextMeter
            usage={contextUsage}
            isCompacting={isCompacting}
          />

          <div className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest text-text-muted">
              Cycle
            </span>
            <span className="font-[family-name:var(--font-code)] text-sm font-bold text-text-primary">
              {pipelineState.currentCycle}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${statusColor[pipelineState.status] ?? "bg-status-idle"} ${
                pipelineState.status === PIPELINE_STATUSES.RUNNING
                  ? "animate-pulse"
                  : ""
              }`}
            />
            <span className="font-[family-name:var(--font-display)] text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
              {statusLabel}
            </span>
          </div>

          {connectionStatus !== "connected" && (
            <span className="rounded bg-severity-critical/10 px-2 py-0.5 text-[10px] font-medium text-severity-critical">
              {connectionStatus === "error" ? "DISCONNECTED" : "RECONNECTING"}
            </span>
          )}

          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded p-1.5 text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
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
      <div className="relative z-10 shrink-0 border-b border-border-subtle">
        <ErrorBoundary fallbackTitle="Workflow Graph Error">
          <WorkflowGraph
            activeAgent={pipelineState.activeAgent}
            cycle={pipelineState.currentCycle}
            status={pipelineState.status}
          />
        </ErrorBoundary>
      </div>

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-0 flex-1">
        {/* Agent Stream */}
        <div className="flex-1 overflow-hidden border-r border-border-subtle">
          <ErrorBoundary fallbackTitle="Agent Stream Error">
            <AgentStream
              entries={streamEntries}
              activeAgent={pipelineState.activeAgent}
            />
          </ErrorBoundary>
        </div>

        {/* Sidebar */}
        <div className="flex w-[360px] shrink-0 flex-col overflow-hidden bg-surface/50">
          {/* Tab bar */}
          <div className="flex shrink-0 border-b border-border-subtle">
            {SIDEBAR_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-center font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-accent text-accent"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {TAB_LABELS[tab]}
                {tab === "tasks" && tasks.length > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent/10 px-1 font-[family-name:var(--font-code)] text-[9px] text-accent">
                    {tasks.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            <ErrorBoundary fallbackTitle="Sidebar Error">
              {activeTab === "tasks" && (
                <TaskList
                  tasks={tasks}
                  onSelectTask={setSelectedTask}
                />
              )}
              {activeTab === "ux" && <UxScorecard tasks={tasks} />}
              {activeTab === "metrics" && (
                <MetricsBar
                  pipelineState={pipelineState}
                  tasks={tasks}
                />
              )}
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* ── Steering Bar ───────────────────────────────────────────────── */}
      <div className="relative z-10 shrink-0">
        <ErrorBoundary fallbackTitle="Steering Bar Error">
          <SteeringBar status={pipelineState.status} />
        </ErrorBoundary>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

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

      {/* ── Celebrations ───────────────────────────────────────────────── */}
      <CelebrationEffects
        tasks={tasks}
        pipelineState={pipelineState}
        events={events}
      />
    </div>
  );
}
