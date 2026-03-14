"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PipelineConfig, PipelineState, AgentRole, PipelineAction } from "@/lib/types";
import { PIPELINE_ACTIONS, PIPELINE_STATUSES } from "@/lib/types";
import { getAgentVisual } from "@/lib/agent-visuals";
import { ContextMeter } from "@/components/ContextMeter";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  running: "bg-status-live",
  paused: "bg-status-paused",
  error: "bg-status-error",
  idle: "bg-status-idle",
  stopped: "bg-status-idle",
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DashboardHeaderProps {
  pipelineState: PipelineState;
  currentConfig: PipelineConfig;
  completedAgents: AgentRole[];
  pipelineAction: PipelineAction | null;
  connectionStatus: string;
  contextUsage: number;
  isCompacting: boolean;
  onStartPipeline: (options?: { resume?: boolean }) => void;
  onStopPipeline: () => void;
  onReconnect: () => void;
  onOpenGit: () => void;
  onOpenSettings: () => void;
  onShowNewProjectConfirm: () => void;
  onShowStartNewModal: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DashboardHeader = memo(function DashboardHeader({
  pipelineState,
  currentConfig,
  pipelineAction,
  connectionStatus,
  contextUsage,
  isCompacting,
  onStartPipeline,
  onStopPipeline,
  onReconnect,
  onOpenGit,
  onOpenSettings,
  onShowNewProjectConfirm,
  onShowStartNewModal,
}: DashboardHeaderProps) {
  const statusLabel =
    pipelineState.status === PIPELINE_STATUSES.RUNNING
      ? "LIVE"
      : pipelineState.status.toUpperCase();

  const isRunning = pipelineState.status === PIPELINE_STATUSES.RUNNING;
  const canStart = !isRunning && pipelineAction !== PIPELINE_ACTIONS.STARTING;

  return (
    <header className="glass-panel relative z-10 flex h-14 shrink-0 items-center justify-between border-t-0 border-x-0 px-3 md:px-5 shadow-elevation-2">
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <h1 className="text-sm font-bold uppercase tracking-[0.15em] text-accent shrink-0">
          Endstate
        </h1>
        <span className="hidden md:inline truncate max-w-[160px] text-xs text-text-muted" title={currentConfig.projectPath}>
          {currentConfig.projectPath.split(/[\\/]/).pop()}
        </span>
        <span className="hidden lg:inline truncate max-w-[200px] rounded-full bg-accent/10 px-2.5 py-0.5 font-mono text-[10px] text-accent shadow-[0_0_12px_rgba(0,229,255,0.1)]" title={currentConfig.model}>
          {currentConfig.model}
        </span>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <ContextMeter
          usage={contextUsage}
          isCompacting={isCompacting}
        />

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-text-muted">
            {pipelineState.currentCycle === 0 && isRunning ? "Setup" : "Cycle"}
          </span>
          <span className="font-mono text-sm font-bold text-text-primary">
            {pipelineState.currentCycle === 0 && isRunning ? "" : pipelineState.currentCycle}
          </span>
        </div>

        {/* Active agent indicator(s) */}
        {isRunning && (() => {
          const agents = (pipelineState.activeAgents?.length ?? 0) > 0
            ? pipelineState.activeAgents!
            : pipelineState.activeAgent ? [pipelineState.activeAgent] : [];
          if (agents.length === 0) return null;
          return (
            <div className="hidden md:flex items-center gap-2 overflow-x-auto">
              {agents.map((agent) => {
                const vis = getAgentVisual(agent);
                return (
                  <div key={agent} className="flex items-center gap-1.5 shrink-0">
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: vis.hex }}
                    />
                    <span className="text-[10px] font-medium" style={{ color: vis.hex }}>
                      {vis.label}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}

        <div className="flex items-center gap-1.5" aria-live="polite" aria-atomic="true">
          <AnimatePresence mode="wait">
            {pipelineState.status === PIPELINE_STATUSES.RUNNING ? (
              <motion.span
                key="live-dot"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="h-2 w-2 rounded-full bg-status-live shadow-[0_0_8px_rgba(0,255,163,0.6)]"
              />
            ) : (
              <motion.span
                key={`dot-${pipelineState.status}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className={`h-2 w-2 rounded-full ${STATUS_COLORS[pipelineState.status] ?? "bg-status-idle"}`}
              />
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.span
              key={statusLabel}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15, ease: [0.25, 1, 0.5, 1] }}
              className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary"
            >
              {statusLabel}
            </motion.span>
          </AnimatePresence>
        </div>

        <span aria-live="polite" aria-atomic="true">
          {connectionStatus !== "connected" && (
            <button
              onClick={onReconnect}
              className="flex items-center gap-1.5 rounded-full bg-severity-critical/10 px-2.5 py-0.5 text-[10px] font-medium text-severity-critical transition-colors hover:bg-severity-critical/20"
              title="Connection lost — click to reconnect now"
            >
              <motion.span
                animate={connectionStatus === "disconnected" ? { opacity: [0.5, 1, 0.5] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                {connectionStatus === "error" || connectionStatus === "disconnected" ? "RECONNECT" : "CONNECTING"}
              </motion.span>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
            </button>
          )}
        </span>

        {/* Pipeline Start / Stop / Resume */}
        {isRunning ? (
          <motion.button
            whileHover={{ scale: 1.06, boxShadow: "0 0 20px rgba(239, 68, 68, 0.25)" }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={onStopPipeline}
            disabled={pipelineAction === PIPELINE_ACTIONS.STOPPING}
            className="flex items-center gap-1.5 rounded-full border border-severity-critical/20 bg-severity-critical/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-severity-critical transition-colors hover:bg-severity-critical/20 disabled:opacity-40"
            aria-label="Stop pipeline"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            {pipelineAction === PIPELINE_ACTIONS.STOPPING ? (
              <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }}>
                Stopping…
              </motion.span>
            ) : "Stop Pipeline"}
          </motion.button>
        ) : (
          <div className="flex items-center gap-1.5">
            {/* Resume — show when there are incomplete tasks to work on */}
            {(pipelineState.tasksSummary.open > 0 || pipelineState.tasksSummary.inProgress > 0) && (
              <motion.button
                whileHover={{ scale: 1.06, boxShadow: "0 0 20px rgba(0, 229, 255, 0.25)" }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                onClick={() => onStartPipeline({ resume: true })}
                disabled={pipelineAction === PIPELINE_ACTIONS.STARTING}
                className="flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
                aria-label="Resume pipeline"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6,4 20,12 6,20" />
                </svg>
                Resume Pipeline
              </motion.button>
            )}
            {/* Start New */}
            <motion.button
              whileHover={{ scale: 1.06, boxShadow: "0 0 20px rgba(0, 255, 163, 0.25)" }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onClick={() => onShowStartNewModal()}
              disabled={!canStart}
              className="flex items-center gap-1.5 rounded-full border border-status-live/20 bg-status-live/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-status-live transition-colors hover:bg-status-live/20 disabled:opacity-40"
              aria-label="Start new pipeline"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6,4 20,12 6,20" />
              </svg>
              {pipelineAction === PIPELINE_ACTIONS.STARTING ? (
                <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }}>
                  Starting…
                </motion.span>
              ) : "Start New"}
            </motion.button>
          </div>
        )}

        {/* Git */}
        <motion.button
          onClick={onOpenGit}
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
          onClick={onShowNewProjectConfirm}
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
          onClick={onOpenSettings}
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
  );
});
