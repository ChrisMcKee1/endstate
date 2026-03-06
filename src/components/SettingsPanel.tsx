"use client";

import { useState, useEffect } from "react";
import type { PipelineConfig, Severity } from "@/lib/types";
import { SEVERITIES } from "@/lib/types";
import { ModelSelector } from "@/components/ModelSelector";
import { CustomizationPanel } from "@/components/CustomizationPanel";

const SEVERITY_OPTIONS: Severity[] = [
  SEVERITIES.CRITICAL,
  SEVERITIES.HIGH,
  SEVERITIES.MEDIUM,
  SEVERITIES.LOW,
];

interface SettingsPanelProps {
  config: PipelineConfig;
  onClose: () => void;
  onSave: (config: PipelineConfig) => void;
}

export function SettingsPanel({ config, onClose, onSave }: SettingsPanelProps) {
  const [draft, setDraft] = useState<PipelineConfig>({ ...config });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"settings" | "customizations">("settings");

  // Close on Escape
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
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-[400px] max-w-full flex-col border-l border-border-subtle bg-surface shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h2 className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wider text-text-primary">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* View toggle */}
        <div className="flex shrink-0 border-b border-border-subtle">
          <button
            onClick={() => setView("settings")}
            className={`flex-1 py-2 text-center font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest transition-colors ${
              view === "settings"
                ? "border-b-2 border-accent text-accent"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Pipeline
          </button>
          <button
            onClick={() => setView("customizations")}
            className={`flex-1 py-2 text-center font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest transition-colors ${
              view === "customizations"
                ? "border-b-2 border-accent text-accent"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Customizations
          </button>
        </div>

        {/* Content */}
        {view === "customizations" ? (
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
        {/* Pipeline settings content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Model */}
          <div className="mb-5">
            <label className="mb-1.5 block font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest text-text-muted">
              Model
            </label>
            <ModelSelector
              value={draft.model}
              onChange={(v) => update("model", v)}
            />
          </div>

          {/* Max cycles */}
          <div className="mb-5">
            <label className="mb-1.5 flex items-center justify-between font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest text-text-muted">
              <span>Max Cycles</span>
              <span className="font-[family-name:var(--font-code)] text-xs text-text-primary">
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
          <div className="mb-5">
            <label className="mb-1.5 block font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest text-text-muted">
              Fix Severity Threshold
            </label>
            <div className="flex gap-1.5">
              {SEVERITY_OPTIONS.map((sev) => (
                <button
                  key={sev}
                  onClick={() => update("fixSeverity", sev)}
                  className={`flex-1 rounded border py-1.5 text-[10px] font-bold transition-colors ${
                    draft.fixSeverity === sev
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border-subtle bg-void/50 text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Agent toggles */}
          <div className="mb-5">
            <label className="mb-2 block font-[family-name:var(--font-display)] text-[10px] uppercase tracking-widest text-text-muted">
              Agents
            </label>
            <div className="space-y-2">
              <ToggleRow
                label="Explorer"
                description="Navigate and test the running app"
                checked={draft.enableExplorer}
                onChange={(v) => update("enableExplorer", v)}
                color="bg-agent-explorer"
              />
              <ToggleRow
                label="Analyst"
                description="Cross-reference findings with code"
                checked={draft.enableAnalyst}
                onChange={(v) => update("enableAnalyst", v)}
                color="bg-agent-analyst"
              />
              <ToggleRow
                label="Fixer"
                description="Apply fixes and verify builds"
                checked={draft.enableFixer}
                onChange={(v) => update("enableFixer", v)}
                color="bg-agent-fixer"
              />
              <ToggleRow
                label="UX Reviewer"
                description="Evaluate from user perspective"
                checked={draft.enableUxReviewer}
                onChange={(v) => update("enableUxReviewer", v)}
                color="bg-agent-ux"
              />
            </div>
          </div>

          {/* Auto-approve */}
          <div className="mb-5">
            <ToggleRow
              label="Auto-approve"
              description="Approve all agent actions without prompting"
              checked={draft.autoApprove}
              onChange={(v) => update("autoApprove", v)}
            />
          </div>

          {/* Infinite sessions */}
          <div className="mb-5">
            <ToggleRow
              label="Infinite sessions"
              description="Enable context compaction for long runs"
              checked={draft.infiniteSessions}
              onChange={(v) => update("infiniteSessions", v)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border-subtle p-4">
          {error && (
            <p className="mb-2 text-xs text-severity-critical">{error}</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-lg bg-accent py-2.5 font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-wider text-void transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

// ─── Toggle helper ───────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  color,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  color?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-lg border border-border-subtle bg-void/30 px-3 py-2 text-left transition-colors hover:bg-elevated"
    >
      {color && (
        <div className={`h-2 w-2 rounded-full ${color}`} />
      )}
      <div className="flex-1">
        <p className="text-xs font-medium text-text-primary">{label}</p>
        <p className="text-[10px] text-text-muted">{description}</p>
      </div>
      <div
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-accent" : "bg-border-active"}`}
      >
        <div
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}
