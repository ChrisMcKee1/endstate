"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const SPRING = { type: "spring" as const, stiffness: 300, damping: 28 };

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
      <div className="relative flex shrink-0 border-b border-white/[0.04]">
        {TABS.map((tab) => {
          const meta = TAB_META[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative flex flex-1 items-center justify-center gap-1.5 py-2.5 text-center text-[10px] uppercase tracking-widest transition-colors ${
                activeTab === tab
                  ? "text-accent"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <span className="text-xs">{meta.icon}</span>
              <span>{meta.label}</span>
              {activeTab === tab && (
                <motion.div
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-accent"
                  layoutId="customization-tab-underline"
                  transition={SPRING}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING}
          >
            {activeTab === "skills" && (
              <SkillManager skills={skills} onChange={onSkillsChange} projectPath={projectPath} />
            )}
            {activeTab === "agents" && (
              <CustomAgentManager agents={customAgents} onChange={onCustomAgentsChange} />
            )}
            {activeTab === "mcp" && (
              <McpServerManager servers={mcpServers} onChange={onMcpServersChange} projectPath={projectPath} />
            )}
            {activeTab === "tools" && (
              <ToolManager tools={toolOverrides} onChange={onToolOverridesChange} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Save footer */}
      <div
        className="shrink-0 border-t border-white/[0.04] p-4"
        style={{ background: "rgba(20, 21, 31, 0.5)" }}
      >
        <motion.button
          onClick={onSave}
          disabled={saving}
          className="w-full rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider text-void transition-opacity disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #00FFA3 0%, #00E5FF 100%)",
            boxShadow: "0 0 20px rgba(0, 255, 163, 0.15)",
          }}
          whileTap={{ scale: 0.98 }}
          whileHover={{ boxShadow: "0 0 28px rgba(0, 255, 163, 0.25)" }}
          transition={SPRING}
        >
          {saving ? "Saving…" : "Save Customizations"}
        </motion.button>
      </div>
    </div>
  );
}
