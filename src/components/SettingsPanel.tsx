"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PipelineConfig, Severity } from "@/lib/types";
import { SEVERITIES } from "@/lib/types";
import { ModelSelector } from "@/components/ModelSelector";
import { CustomizationPanel } from "@/components/CustomizationPanel";
import { ProjectManager } from "@/components/ProjectManager";
import { useTheme, ALL_THEMES, THEME_META } from "@/components/ThemeProvider";
import type { Theme } from "@/components/ThemeProvider";

const SEVERITY_OPTIONS: Severity[] = [
  SEVERITIES.CRITICAL,
  SEVERITIES.HIGH,
  SEVERITIES.MEDIUM,
  SEVERITIES.LOW,
];

const SEVERITY_FILL: Record<Severity, string> = {
  [SEVERITIES.CRITICAL]: "bg-severity-critical text-white",
  [SEVERITIES.HIGH]: "bg-severity-high text-white",
  [SEVERITIES.MEDIUM]: "bg-severity-medium text-void",
  [SEVERITIES.LOW]: "bg-severity-low text-white",
};

const SPRING = { type: "spring" as const, stiffness: 400, damping: 28 };

const TABS = ["settings", "customizations", "projects"] as const;
type TabView = (typeof TABS)[number];
const TAB_LABELS: Record<TabView, string> = {
  settings: "Pipeline",
  customizations: "Customizations",
  projects: "Projects",
};

interface SettingsPanelProps {
  config: PipelineConfig;
  onClose: () => void;
  onSave: (config: PipelineConfig) => void;
}

export function SettingsPanel({ config, onClose, onSave }: SettingsPanelProps) {
  const [draft, setDraft] = useState<PipelineConfig>({ ...config });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<TabView>("settings");
  const tabRefs = useRef<Record<TabView, HTMLButtonElement | null>>({ settings: null, customizations: null, projects: null });
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Update tab indicator position
  useEffect(() => {
    const el = tabRefs.current[view];
    if (el) {
      const parent = el.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        setIndicatorStyle({
          left: elRect.left - parentRect.left,
          width: elRect.width,
        });
      }
    }
  }, [view]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (res.ok) {
        const data = (await res.json()) as { config: PipelineConfig };
        onSave(data.config);
      } else {
        const err = (await res.json()) as { error?: string };
        setError(err.error ?? "Failed to save");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof PipelineConfig>(
    key: K,
    value: PipelineConfig[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <AnimatePresence>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Panel */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="glass-panel flex h-full w-[400px] max-w-full flex-col rounded-l-2xl border-l border-border-subtle"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
              Settings
            </h2>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={SPRING}
              onClick={onClose}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
              aria-label="Close settings"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>

          {/* Tab bar with animated underline */}
          <div className="relative flex shrink-0 border-b border-border-subtle">
            {TABS.map((tab) => (
              <button
                key={tab}
                ref={(el) => { tabRefs.current[tab] = el; }}
                onClick={() => setView(tab)}
                className={`flex-1 py-2.5 text-center text-[10px] uppercase tracking-widest transition-colors ${
                  view === tab ? "text-accent" : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
            <motion.div
              className="absolute bottom-0 h-0.5 bg-accent"
              animate={{ left: indicatorStyle.left, width: indicatorStyle.width }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          </div>

          {/* Content */}
          {view === "projects" ? (
            <div className="flex-1 overflow-y-auto p-4">
              <ProjectManager />
            </div>
          ) : view === "customizations" ? (
            <CustomizationPanel
              skills={draft.skills}
              customAgents={draft.customAgentDefinitions}
              mcpServers={draft.mcpServerOverrides}
              toolOverrides={draft.toolOverrides}
              onSkillsChange={(v) => update("skills", v)}
              onCustomAgentsChange={(v) => update("customAgentDefinitions", v)}
              onMcpServersChange={(v) => update("mcpServerOverrides", v)}
              onToolOverridesChange={(v) => update("toolOverrides", v)}
              onSave={handleSave}
              saving={saving}
              projectPath={draft.projectPath}
            />
          ) : (
          <>
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Model section */}
            <div className="glass-panel rounded-xl p-4">
              <label className="mb-2 block text-[10px] uppercase tracking-widest text-text-muted">
                Model
              </label>
              <ModelSelector
                value={draft.model}
                onChange={(v) => update("model", v)}
              />
            </div>

            {/* Max cycles section */}
            <div className="glass-panel rounded-xl p-4">
              <label className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-text-muted">
                <span>Max Cycles</span>
                <span className="font-mono text-xs text-text-primary">
                  {draft.maxCycles}
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={50}
                value={draft.maxCycles}
                onChange={(e) => update("maxCycles", parseInt(e.target.value, 10))}
                className="w-full accent-accent"
              />
            </div>

            {/* Fix severity threshold */}
            <div className="glass-panel rounded-xl p-4">
              <label className="mb-2 block text-[10px] uppercase tracking-widest text-text-muted">
                Fix Severity Threshold
              </label>
              <div className="flex gap-1.5">
                {SEVERITY_OPTIONS.map((sev) => (
                  <motion.button
                    key={sev}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={SPRING}
                    onClick={() => update("fixSeverity", sev)}
                    className={`flex-1 rounded-full py-1.5 text-[10px] font-bold transition-colors ${
                      draft.fixSeverity === sev
                        ? SEVERITY_FILL[sev]
                        : "border border-border-subtle bg-void/50 text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    {sev}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Agent toggles */}
            <div className="glass-panel rounded-xl p-4">
              <label className="mb-3 block text-[10px] uppercase tracking-widest text-text-muted">
                Core Agents
              </label>
              <div className="space-y-2">
                <ToggleRow
                  label="Researcher"
                  description="One-time project discovery at pipeline start"
                  checked={draft.enableResearcher}
                  onChange={(v) => update("enableResearcher", v)}
                  color="bg-agent-researcher"
                  glowColor="rgba(255,107,107,0.3)"
                />
                <ToggleRow
                  label="Explorer"
                  description="Navigate and test the running app"
                  checked={draft.enableExplorer}
                  onChange={(v) => update("enableExplorer", v)}
                  color="bg-agent-explorer"
                  glowColor="rgba(0,229,255,0.3)"
                />
                <ToggleRow
                  label="Consolidator"
                  description="Merge worktree changes and verify combined build"
                  checked={draft.enableConsolidator}
                  onChange={(v) => update("enableConsolidator", v)}
                  color="bg-agent-consolidator"
                  glowColor="rgba(255,215,0,0.3)"
                />
                <ToggleRow
                  label="Code Simplifier"
                  description="Review and simplify code changes each cycle"
                  checked={draft.enableCodeSimplifier}
                  onChange={(v) => update("enableCodeSimplifier", v)}
                  color="bg-agent-simplifier"
                  glowColor="rgba(255,105,180,0.3)"
                />
                <ToggleRow
                  label="UX Reviewer"
                  description="Evaluate from user perspective"
                  checked={draft.enableUxReviewer}
                  onChange={(v) => update("enableUxReviewer", v)}
                  color="bg-agent-ux"
                  glowColor="rgba(255,184,0,0.3)"
                />
              </div>
            </div>

            {/* Domain stream toggles */}
            <div className="glass-panel rounded-xl p-4">
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-text-muted">
                Domain Streams
              </label>
              <p className="mb-3 text-[9px] text-text-muted/60">
                Each domain enables a paired Analyst + Fixer agent
              </p>
              <div className="space-y-2">
                <ToggleRow
                  label="UI / Frontend"
                  description="Analyse and fix UI components, styles, accessibility"
                  checked={draft.enableDomainUI}
                  onChange={(v) => update("enableDomainUI", v)}
                  color="bg-agent-analyst-ui"
                  glowColor="rgba(0,229,255,0.3)"
                />
                <ToggleRow
                  label="Backend / API"
                  description="Analyse and fix server routes, business logic, auth"
                  checked={draft.enableDomainBackend}
                  onChange={(v) => update("enableDomainBackend", v)}
                  color="bg-agent-analyst-backend"
                  glowColor="rgba(176,38,255,0.3)"
                />
                <ToggleRow
                  label="Database"
                  description="Analyse and fix schemas, queries, migrations"
                  checked={draft.enableDomainDatabase}
                  onChange={(v) => update("enableDomainDatabase", v)}
                  color="bg-agent-analyst-database"
                  glowColor="rgba(255,215,0,0.3)"
                />
                <ToggleRow
                  label="Documentation"
                  description="Analyse and fix docs, README, API specs"
                  checked={draft.enableDomainDocs}
                  onChange={(v) => update("enableDomainDocs", v)}
                  color="bg-agent-analyst-docs"
                  glowColor="rgba(255,105,180,0.3)"
                />
              </div>
            </div>

            {/* Worktree isolation */}
            <div className="glass-panel rounded-xl p-4">
              <label className="mb-3 block text-[10px] uppercase tracking-widest text-text-muted">
                Isolation
              </label>
              <ToggleRow
                label="Worktree Isolation"
                description="Run each domain fixer in its own git worktree"
                checked={draft.enableWorktreeIsolation}
                onChange={(v) => update("enableWorktreeIsolation", v)}
                color="bg-accent"
                glowColor="rgba(0,229,255,0.3)"
              />
            </div>

            {/* Auto-approve & Infinite sessions */}
            <div className="glass-panel rounded-xl p-4 space-y-2">
              <ToggleRow
                label="Auto-approve"
                description="Approve all agent actions without prompting"
                checked={draft.autoApprove}
                onChange={(v) => update("autoApprove", v)}
              />
              <ToggleRow
                label="Infinite sessions"
                description="Enable context compaction for long runs"
                checked={draft.infiniteSessions}
                onChange={(v) => update("infiniteSessions", v)}
              />
            </div>

            {/* Theme selector */}
            <ThemePicker />
          </div>

          {/* Footer */}
          <div className="border-t border-border-subtle p-4">
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-2 text-xs text-severity-critical"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(0,255,163,0.2)" }}
              whileTap={{ scale: 0.98 }}
              transition={SPRING}
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl bg-status-live py-2.5 text-xs font-bold uppercase tracking-wider text-void transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Settings"}
            </motion.button>
          </div>
          </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Toggle helper ───────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  color,
  glowColor,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  color?: string;
  glowColor?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={SPRING}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-xl border border-border-subtle bg-void/30 px-3 py-2.5 text-left transition-colors hover:bg-elevated"
      style={checked && glowColor ? { boxShadow: `inset 3px 0 0 ${glowColor}` } : undefined}
    >
      {color && (
        <motion.div
          animate={{
            opacity: checked ? 1 : 0.3,
            scale: checked ? 1 : 0.8,
          }}
          transition={SPRING}
          className={`h-2.5 w-2.5 rounded-full ${color}`}
          style={checked && glowColor ? { boxShadow: `0 0 8px ${glowColor}` } : undefined}
        />
      )}
      <div className="flex-1">
        <p className="text-xs font-medium text-text-primary">{label}</p>
        <p className="text-[10px] text-text-muted">{description}</p>
      </div>
      <motion.div
        className="relative h-5 w-9 rounded-full"
        animate={{
          backgroundColor: checked ? "rgb(0, 229, 255)" : "rgba(255,255,255,0.08)",
        }}
        transition={SPRING}
      >
        <motion.div
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow"
          animate={{ x: checked ? 16 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        />
      </motion.div>
    </motion.button>
  );
}

// ─── Theme picker ────────────────────────────────────────────────────────────

function ThemePicker() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="glass-panel rounded-xl p-4">
      <label className="mb-3 block text-[10px] uppercase tracking-widest text-text-muted">
        Theme
      </label>
      <div className="grid grid-cols-2 gap-2">
        {ALL_THEMES.map((t) => {
          const meta = THEME_META[t];
          const active = theme === t;
          return (
            <motion.button
              key={t}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING}
              onClick={() => setTheme(t as Theme)}
              className={`relative flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                active
                  ? "border-accent/30 bg-accent/5"
                  : "border-border-subtle bg-void/30 hover:bg-elevated"
              }`}
              style={
                active
                  ? { boxShadow: `0 0 12px ${meta.color}20` }
                  : undefined
              }
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: meta.color,
                    boxShadow: active ? `0 0 8px ${meta.color}60` : "none",
                  }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: active ? meta.color : "var(--color-text-primary)" }}
                >
                  {meta.label}
                </span>
              </div>
              <span className="text-[9px] text-text-muted">
                {meta.description}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}