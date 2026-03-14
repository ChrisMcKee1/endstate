"use client";

import { motion } from "framer-motion";
import type { ToolEntry, ToolType } from "@/lib/types";
import { TOOL_TYPES } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

interface ToolMeta {
  name: string;
  description: string;
  category: string;
  dangerous: boolean;
}

const TOOL_CATEGORIES = ["File Operations", "Shell", "Git", "Search"] as const;
type ToolCategory = (typeof TOOL_CATEGORIES)[number];

const KNOWN_TOOLS: ToolMeta[] = [
  { name: "file_read", description: "Read contents of a file", category: "File Operations", dangerous: false },
  { name: "file_write", description: "Create or overwrite a file", category: "File Operations", dangerous: false },
  { name: "file_edit", description: "Make targeted edits to a file", category: "File Operations", dangerous: false },
  { name: "file_delete", description: "Permanently delete a file from disk", category: "File Operations", dangerous: true },
  { name: "file_list", description: "List directory contents", category: "File Operations", dangerous: false },
  { name: "file_search", description: "Search for files by pattern", category: "File Operations", dangerous: false },
  { name: "shell", description: "Execute arbitrary shell commands", category: "Shell", dangerous: true },
  { name: "git_status", description: "Show working tree status", category: "Git", dangerous: false },
  { name: "git_diff", description: "Show changes between commits", category: "Git", dangerous: false },
  { name: "git_commit", description: "Create a new commit", category: "Git", dangerous: false },
  { name: "git_push", description: "Push commits to remote", category: "Git", dangerous: false },
  { name: "git_branch", description: "Create or list branches", category: "Git", dangerous: false },
  { name: "git_checkout", description: "Switch branches or restore files", category: "Git", dangerous: false },
  { name: "git_log", description: "Show commit log", category: "Git", dangerous: false },
  { name: "grep_search", description: "Search file contents with regex", category: "Search", dangerous: false },
  { name: "semantic_search", description: "AI-powered semantic code search", category: "Search", dangerous: false },
];

const CATEGORY_ICONS: Record<ToolCategory, string> = {
  "File Operations": "📁",
  Shell: "⚡",
  Git: "🔀",
  Search: "🔍",
};

const CATEGORY_ACCENT: Record<ToolCategory, string> = {
  "File Operations": "var(--color-accent)",
  Shell: "var(--color-agent-ux)",
  Git: "var(--color-accent-violet)",
  Search: "var(--color-accent-emerald)",
};

const SPRING = { type: "spring" as const, stiffness: 300, damping: 26 };

// ─── Component ────────────────────────────────────────────────────────────────

interface ToolManagerProps {
  tools: ToolEntry[];
  onChange: (tools: ToolEntry[]) => void;
}

export function ToolManager({ tools, onChange }: ToolManagerProps) {
  const toolMap = new Map(tools.map((t) => [t.name, t]));

  const getEntry = (name: string, type: ToolType): ToolEntry => {
    return toolMap.get(name) ?? { name, type, enabled: true };
  };

  const toggleTool = (name: string, type: ToolType) => {
    const existing = toolMap.get(name);
    if (existing) {
      onChange(tools.map((t) => (t.name === name ? { ...t, enabled: !t.enabled } : t)));
    } else {
      onChange([...tools, { name, type, enabled: false }]);
    }
  };

  const grouped = TOOL_CATEGORIES.map((category) => ({
    category,
    tools: KNOWN_TOOLS.filter((t) => t.category === category),
  }));

  return (
    <div className="space-y-5">
      {grouped.map(({ category, tools: categoryTools }) => (
        <div key={category}>
          <h3
            className="mb-2 flex items-center gap-2 border-l-2 pl-2 text-[10px] font-bold uppercase tracking-widest text-text-muted"
            style={{ borderColor: CATEGORY_ACCENT[category as ToolCategory] }}
          >
            <span>{CATEGORY_ICONS[category as ToolCategory]}</span>
            {category}
          </h3>
          <div className="space-y-1">
            {categoryTools.map((meta) => {
              const entry = getEntry(meta.name, TOOL_TYPES.BUILTIN);
              return (
                <motion.button
                  key={meta.name}
                  onClick={() => toggleTool(meta.name, TOOL_TYPES.BUILTIN)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] px-3 py-2 text-left backdrop-blur-sm transition-colors"
                  style={{
                    background: entry.enabled ? "var(--color-surface)" : "var(--color-void)",
                    opacity: entry.enabled ? 1 : 0.6,
                  }}
                  whileHover={{ y: -1, boxShadow: meta.dangerous && entry.enabled ? "0 0 12px rgba(239,68,68,0.1)" : "0 4px 16px rgba(0,0,0,0.2)" }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING}
                >
                  {/* Danger icon or status dot */}
                  {meta.dangerous ? (
                    <div className="group relative shrink-0">
                      <svg
                        className={`h-4 w-4 ${entry.enabled ? "text-severity-high" : "text-severity-high/40"}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        style={entry.enabled ? { filter: "drop-shadow(0 0 4px rgba(249,115,22,0.4))" } : undefined}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-overlay px-2 py-1 text-[9px] text-severity-high opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                        Potentially dangerous
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`h-2 w-2 shrink-0 rounded-full ${entry.enabled ? "bg-status-live" : "bg-status-idle"}`}
                      style={entry.enabled ? { boxShadow: "0 0 6px rgba(0,255,163,0.3)" } : undefined}
                    />
                  )}

                  {/* Label */}
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-xs text-text-primary">{meta.name}</span>
                    <p className="text-[10px] text-text-muted">{meta.description}</p>
                  </div>

                  {/* Toggle */}
                  <div className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${entry.enabled ? "bg-accent" : "bg-white/[0.08]"}`}>
                    <motion.div
                      className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow"
                      animate={{ x: entry.enabled ? 16 : 2 }}
                      transition={SPRING}
                    />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
