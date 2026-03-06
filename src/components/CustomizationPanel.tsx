"use client";

import { useState } from "react";
import type {
  SkillDefinition,
  CustomAgentDefinition,
  McpServerEntry,
  ToolEntry,
} from "@/lib/types";
import { SkillManager } from "@/components/SkillManager";
import { CustomAgentManager } from "@/components/CustomAgentManager";
import { McpServerManager } from "@/components/McpServerManager";
import { ToolManager } from "@/components/ToolManager";

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ["skills", "agents", "mcp", "tools"] as const;
type CustomizationTab = (typeof TABS)[number];

const TAB_META: Record<CustomizationTab, { label: string; icon: string }> = {
  skills:  { label: "Skills",      icon: "🧩" },
  agents:  { label: "Agents",      icon: "🤖" },
  mcp:     { label: "MCP Servers", icon: "🔌" },
  tools:   { label: "Tools",       icon: "🔧" },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface CustomizationPanelProps {
  skills: SkillDefinition[];
  customAgents: CustomAgentDefinition[];
  mcpServers: McpServerEntry[];
  toolOverrides: ToolEntry[];
  onSkillsChange: (skills: SkillDefinition[]) => void;
  onCustomAgentsChange: (agents: CustomAgentDefinition[]) => void;
  onMcpServersChange: (servers: McpServerEntry[]) => void;
  onToolOverridesChange: (tools: ToolEntry[]) => void;
  onSave: () => void;
  saving?: boolean;
  projectPath?: string;
}

export function CustomizationPanel({
  skills,
  customAgents,
  mcpServers,
  toolOverrides,
  onSkillsChange,
  onCustomAgentsChange,
  onMcpServersChange,
  onToolOverridesChange,
  onSave,
  saving,
  projectPath,
}: CustomizationPanelProps) {
  const [activeTab, setActiveTab] = useState<CustomizationTab>("skills");

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-border-subtle">
        {TABS.map((tab) => {
          const meta = TAB_META[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-center font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-accent text-accent"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <span className="text-xs">{meta.icon}</span>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="animate-fade-in" key={activeTab}>
          {activeTab === "skills" && (
            <SkillManager
              skills={skills}
              onChange={onSkillsChange}
              projectPath={projectPath}
            />
          )}
          {activeTab === "agents" && (
            <CustomAgentManager
              agents={customAgents}
              onChange={onCustomAgentsChange}
            />
          )}
          {activeTab === "mcp" && (
            <McpServerManager
              servers={mcpServers}
              onChange={onMcpServersChange}
              projectPath={projectPath}
            />
          )}
          {activeTab === "tools" && (
            <ToolManager
              tools={toolOverrides}
              onChange={onToolOverridesChange}
            />
          )}
        </div>
      </div>

      {/* Save footer */}
      <div className="shrink-0 border-t border-border-subtle p-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full rounded-lg bg-accent py-2.5 font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-wider text-void transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Customizations"}
        </button>
      </div>
    </div>
  );
}
