"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PipelineConfig, Severity } from "@/lib/types";
import { SEVERITIES } from "@/lib/types";
import { ModelSelector } from "@/components/ModelSelector";

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Project", icon: "📁" },
  { label: "Vision", icon: "💡" },
  { label: "Model", icon: "🤖" },
  { label: "Pipeline", icon: "⚙️" },
  { label: "Launch", icon: "🚀" },
] as const;

const SCENARIO_TEMPLATES = [
  {
    label: "Review & Fix Everything",
    value:
      "Review this entire application. Find all bugs, errors, broken flows, and UX issues. Fix everything you find. Keep iterating until the app is stable and polished.",
    icon: "🔍",
  },
  {
    label: "Improve UX",
    value:
      "Evaluate this application from a real user's perspective. Fix confusing navigation, unclear error messages, empty states, accessibility issues, and anything that would frustrate a non-technical user.",
    icon: "✨",
  },
  {
    label: "Security Scan",
    value:
      "Perform a thorough security review. Check for injection vulnerabilities, auth issues, exposed secrets, insecure configurations, CORS problems, and common OWASP Top 10 risks. Fix all vulnerabilities found.",
    icon: "🔒",
  },
  {
    label: "Refactor for Quality",
    value:
      "Analyze the codebase for code quality issues. Refactor complex functions, remove dead code, improve error handling, add missing types, fix anti-patterns, and improve overall maintainability.",
    icon: "🏗️",
  },
  {
    label: "Build from Scratch",
    value: "",
    icon: "🆕",
  },
  {
    label: "Custom",
    value: "",
    icon: "✏️",
  },
] as const;

const SEVERITY_OPTIONS: Severity[] = [
  SEVERITIES.CRITICAL,
  SEVERITIES.HIGH,
  SEVERITIES.MEDIUM,
  SEVERITIES.LOW,
];

const DEFAULT_CONFIG: PipelineConfig = {
  projectPath: "",
  appUrl: "http://localhost:3000",
  inspiration: "",
  maxCycles: 10,
  model: "claude-opus-4.6",
  autoApprove: true,
  infiniteSessions: true,
  fixSeverity: SEVERITIES.HIGH,
  enableExplorer: true,
  enableAnalyst: true,
  enableFixer: true,
  enableUxReviewer: true,
};

// ─── Component ───────────────────────────────────────────────────────────────

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<PipelineConfig>({ ...DEFAULT_CONFIG });
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof PipelineConfig>(
    key: K,
    value: PipelineConfig[K],
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const canAdvance = useCallback((): boolean => {
    switch (step) {
      case 0:
        return config.projectPath.trim().length > 0;
      case 1:
        return config.inspiration.trim().length > 0;
      case 2:
        return config.model.trim().length > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  }, [step, config]);

  const handleLaunch = async () => {
    setLaunching(true);
    setError(null);

    try {
      // Save config
      const settingsRes = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!settingsRes.ok) {
        const errData = (await settingsRes.json()) as { error?: string };
        throw new Error(errData.error ?? "Failed to save settings");
      }

      // Start pipeline
      const startRes = await fetch("/api/pipeline/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!startRes.ok) {
        const errData = (await startRes.json()) as { error?: string };
        throw new Error(errData.error ?? "Failed to start pipeline");
      }

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLaunching(false);
    }
  };

  return (
    <div className="noise relative flex min-h-screen flex-col items-center justify-center bg-void px-4 py-8">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,207,255,0.05)_0%,transparent_60%)]" />

      <div className="relative z-10 w-full max-w-xl">
        {/* Logo / Title */}
        <div className="mb-8 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-[0.2em] text-accent">
            Agentic
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Autonomous Development Pipeline
          </p>
        </div>

        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-1">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i >= step}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${
                  i === step
                    ? "border border-accent bg-accent/10 text-accent"
                    : i < step
                      ? "text-text-secondary hover:text-accent"
                      : "text-text-muted/40"
                }`}
              >
                <span className="text-xs">{s.icon}</span>
                <span className="font-[family-name:var(--font-display)] text-[9px] uppercase tracking-wider">
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-1 h-px w-6 ${
                    i < step ? "bg-accent/50" : "bg-border-subtle"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="rounded-xl border border-border-subtle bg-surface shadow-2xl">
          <div className="p-6 animate-fade-in" key={step}>
            {/* Step 0: Project Path */}
            {step === 0 && (
              <div>
                <h2 className="mb-1 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wider text-text-primary">
                  Project Path
                </h2>
                <p className="mb-4 text-xs text-text-muted">
                  Point to any project folder. Existing code will be analyzed
                  and improved. An empty folder starts from scratch.
                </p>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={config.projectPath}
                    onChange={(e) => update("projectPath", e.target.value)}
                    placeholder="/path/to/your/project"
                    className="w-full rounded-lg border border-border-subtle bg-void/50 px-4 py-3 font-[family-name:var(--font-code)] text-sm text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                  />

                  <input
                    type="text"
                    value={config.appUrl}
                    onChange={(e) => update("appUrl", e.target.value)}
                    placeholder="http://localhost:3000"
                    className="w-full rounded-lg border border-border-subtle bg-void/50 px-4 py-3 font-[family-name:var(--font-code)] text-sm text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                  />
                  <p className="text-[10px] text-text-muted">
                    URL where the running app can be accessed by agents
                  </p>
                </div>
              </div>
            )}

            {/* Step 1: Inspiration */}
            {step === 1 && (
              <div>
                <h2 className="mb-1 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wider text-text-primary">
                  Vision & Inspiration
                </h2>
                <p className="mb-4 text-xs text-text-muted">
                  Describe what you want the agents to do. This guides all agent
                  behavior throughout the pipeline.
                </p>

                {/* Scenario chips */}
                <div className="mb-4 grid grid-cols-2 gap-2">
                  {SCENARIO_TEMPLATES.map((scenario) => (
                    <button
                      key={scenario.label}
                      onClick={() => {
                        if (scenario.value) {
                          update("inspiration", scenario.value);
                        }
                      }}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                        config.inspiration === scenario.value &&
                        scenario.value
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border-subtle bg-void/30 text-text-secondary hover:border-border-active"
                      }`}
                    >
                      <span>{scenario.icon}</span>
                      <span>{scenario.label}</span>
                    </button>
                  ))}
                </div>

                <textarea
                  value={config.inspiration}
                  onChange={(e) => update("inspiration", e.target.value)}
                  placeholder="Describe your vision in detail. What are you building? Who is it for? What should the agents focus on?"
                  rows={6}
                  className="w-full resize-none rounded-lg border border-border-subtle bg-void/50 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
              </div>
            )}

            {/* Step 2: Model Selection */}
            {step === 2 && (
              <div>
                <h2 className="mb-1 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wider text-text-primary">
                  AI Model
                </h2>
                <p className="mb-4 text-xs text-text-muted">
                  Choose the model that powers all agents. Larger context
                  windows are better for complex codebases.
                </p>

                <ModelSelector
                  value={config.model}
                  onChange={(v) => update("model", v)}
                />
              </div>
            )}

            {/* Step 3: Pipeline Settings */}
            {step === 3 && (
              <div>
                <h2 className="mb-1 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wider text-text-primary">
                  Pipeline Settings
                </h2>
                <p className="mb-4 text-xs text-text-muted">
                  Configure how the autonomous pipeline operates.
                </p>

                <div className="space-y-5">
                  {/* Max cycles */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs text-text-secondary">
                        Max cycles
                      </label>
                      <span className="font-[family-name:var(--font-code)] text-sm font-bold text-accent">
                        {config.maxCycles}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      value={config.maxCycles}
                      onChange={(e) =>
                        update("maxCycles", parseInt(e.target.value, 10))
                      }
                      className="w-full accent-accent"
                    />
                    <div className="mt-0.5 flex justify-between text-[9px] text-text-muted">
                      <span>Quick scan</span>
                      <span>Deep analysis</span>
                    </div>
                  </div>

                  {/* Severity threshold */}
                  <div>
                    <label className="mb-1.5 block text-xs text-text-secondary">
                      Fix severity threshold
                    </label>
                    <div className="flex gap-1.5">
                      {SEVERITY_OPTIONS.map((sev) => (
                        <button
                          key={sev}
                          onClick={() => update("fixSeverity", sev)}
                          className={`flex-1 rounded border py-2 text-[10px] font-bold transition-colors ${
                            config.fixSeverity === sev
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
                  <div>
                    <label className="mb-2 block text-xs text-text-secondary">
                      Agents
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <AgentToggle
                        label="Explorer"
                        color="bg-agent-explorer"
                        checked={config.enableExplorer}
                        onChange={(v) => update("enableExplorer", v)}
                      />
                      <AgentToggle
                        label="Analyst"
                        color="bg-agent-analyst"
                        checked={config.enableAnalyst}
                        onChange={(v) => update("enableAnalyst", v)}
                      />
                      <AgentToggle
                        label="Fixer"
                        color="bg-agent-fixer"
                        checked={config.enableFixer}
                        onChange={(v) => update("enableFixer", v)}
                      />
                      <AgentToggle
                        label="UX Reviewer"
                        color="bg-agent-ux"
                        checked={config.enableUxReviewer}
                        onChange={(v) => update("enableUxReviewer", v)}
                      />
                    </div>
                  </div>

                  {/* Toggles row */}
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-text-secondary">
                      <input
                        type="checkbox"
                        checked={config.autoApprove}
                        onChange={(e) =>
                          update("autoApprove", e.target.checked)
                        }
                        className="accent-accent"
                      />
                      Auto-approve
                    </label>
                    <label className="flex items-center gap-2 text-xs text-text-secondary">
                      <input
                        type="checkbox"
                        checked={config.infiniteSessions}
                        onChange={(e) =>
                          update("infiniteSessions", e.target.checked)
                        }
                        className="accent-accent"
                      />
                      Infinite sessions
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <div>
                <h2 className="mb-1 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wider text-text-primary">
                  Ready to Launch
                </h2>
                <p className="mb-4 text-xs text-text-muted">
                  Review your configuration and start the autonomous pipeline.
                </p>

                {/* Summary */}
                <div className="mb-5 space-y-2 rounded-lg border border-border-subtle bg-void/30 p-4">
                  <SummaryRow
                    label="Project"
                    value={config.projectPath}
                  />
                  <SummaryRow label="App URL" value={config.appUrl} />
                  <SummaryRow label="Model" value={config.model} />
                  <SummaryRow
                    label="Max Cycles"
                    value={String(config.maxCycles)}
                  />
                  <SummaryRow
                    label="Fix Threshold"
                    value={config.fixSeverity}
                  />
                  <SummaryRow
                    label="Agents"
                    value={[
                      config.enableExplorer && "Explorer",
                      config.enableAnalyst && "Analyst",
                      config.enableFixer && "Fixer",
                      config.enableUxReviewer && "UX",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />
                  <SummaryRow
                    label="Vision"
                    value={
                      config.inspiration.length > 100
                        ? config.inspiration.slice(0, 100) + "…"
                        : config.inspiration
                    }
                  />
                </div>

                {error && (
                  <p className="mb-3 text-xs text-severity-critical">
                    {error}
                  </p>
                )}

                <button
                  onClick={handleLaunch}
                  disabled={launching}
                  className="group relative w-full overflow-hidden rounded-lg bg-accent py-3.5 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wider text-void transition-all hover:shadow-[0_0_30px_rgba(0,207,255,0.3)] disabled:opacity-60"
                >
                  <span className="relative z-10">
                    {launching ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-void border-t-transparent" />
                        Launching…
                      </span>
                    ) : (
                      "🚀 Start Pipeline"
                    )}
                  </span>
                  {!launching && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100 animate-shimmer" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-border-subtle px-6 py-4">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="text-xs text-text-muted transition-colors hover:text-text-primary disabled:invisible"
            >
              ← Back
            </button>

            {step < 4 && (
              <button
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                disabled={!canAdvance()}
                className="rounded-lg bg-accent/10 px-6 py-2 font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-wider text-accent transition-all hover:bg-accent/20 disabled:opacity-30"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper components ───────────────────────────────────────────────────────

function AgentToggle({
  label,
  color,
  checked,
  onChange,
}: {
  label: string;
  color: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
        checked
          ? "border-accent/30 bg-accent/5 text-text-primary"
          : "border-border-subtle bg-void/30 text-text-muted"
      }`}
    >
      <div
        className={`h-2 w-2 rounded-full transition-opacity ${color} ${checked ? "opacity-100" : "opacity-30"}`}
      />
      {label}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-20 shrink-0 font-[family-name:var(--font-display)] text-[10px] uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <span className="font-[family-name:var(--font-code)] text-xs text-text-secondary">
        {value}
      </span>
    </div>
  );
}
