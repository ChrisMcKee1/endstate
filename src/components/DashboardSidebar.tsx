"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PipelineConfig, PipelineState, Task, AgentRole } from "@/lib/types";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TaskList } from "@/components/TaskList";
import { UxScorecard } from "@/components/UxScorecard";
import { MetricsBar } from "@/components/MetricsBar";
import { AwardsPanel } from "@/components/AwardsPanel";
import { ProjectKnowledge } from "@/components/ProjectKnowledge";
import { VisionPanel } from "@/components/VisionPanel";

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDEBAR_TABS = ["knowledge", "tasks", "ux", "metrics", "awards", "vision"] as const;
export type SidebarTab = (typeof SIDEBAR_TABS)[number];

const TAB_LABELS: Record<SidebarTab, string> = {
  knowledge: "Intel",
  tasks: "Tasks",
  ux: "UX",
  metrics: "Metrics",
  awards: "Awards",
  vision: "Vision",
};

export function isSidebarTab(value: string): value is SidebarTab {
  return (SIDEBAR_TABS as readonly string[]).includes(value);
}

// ─── Tab content animation ────────────────────────────────────────────────────

const TAB_TRANSITION = { duration: 0.15, ease: [0.25, 1, 0.5, 1] } as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface DashboardSidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  tasks: Task[];
  pipelineState: PipelineState;
  currentConfig: PipelineConfig | null;
  isRunning: boolean;
  onSelectTask: (task: Task) => void;
  onRefreshTasks: () => void;
  onUpdateVision: (vision: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DashboardSidebar = memo(function DashboardSidebar({
  activeTab,
  onTabChange,
  tasks,
  pipelineState,
  currentConfig,
  isRunning,
  onSelectTask,
  onRefreshTasks,
  onUpdateVision,
}: DashboardSidebarProps) {
  return (
    <>
      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-border-subtle" role="tablist">
        {SIDEBAR_TABS.map((tab) => (
          <button
            key={tab}
            id={`sidebar-tab-${tab}`}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls="sidebar-tabpanel"
            onClick={() => onTabChange(tab)}
            className={`relative flex-1 py-2.5 text-center text-[10px] uppercase tracking-widest transition-colors ${
              activeTab === tab
                ? "text-accent"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {TAB_LABELS[tab]}
            {tab === "tasks" && tasks.length > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent/10 px-1 font-mono text-[9px] text-accent">
                {tasks.length}
              </span>
            )}
            {activeTab === tab && (
              <motion.div
                layoutId="sidebar-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden" role="tabpanel" id="sidebar-tabpanel" aria-labelledby={`sidebar-tab-${activeTab}`}>
        <ErrorBoundary fallbackTitle="Sidebar Error">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={TAB_TRANSITION}
              className="h-full"
            >
              {activeTab === "tasks" && (
                <TaskList
                  tasks={tasks}
                  onSelectTask={onSelectTask}
                  onRefreshTasks={onRefreshTasks}
                  isRunning={isRunning}
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
              {activeTab === "knowledge" && (
                <ProjectKnowledge
                  projectPath={currentConfig?.projectPath ?? ""}
                  isRunning={isRunning}
                />
              )}
              {activeTab === "vision" && (
                <VisionPanel
                  inspiration={currentConfig?.inspiration ?? ""}
                  onUpdate={onUpdateVision}
                  isRunning={isRunning}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </div>
    </>
  );
});
