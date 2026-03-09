"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { PipelineConfig, Severity } from "@/lib/types";
import { SEVERITIES } from "@/lib/types";
import { ModelSelector } from "@/components/ModelSelector";
import { SkillManager } from "@/components/SkillManager";
import { McpServerManager } from "@/components/McpServerManager";
import { ToolManager } from "@/components/ToolManager";
import { openFolderPicker, validatePath } from "@/app/actions/browse";

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Project", icon: "📁" },
  { label: "Vision", icon: "💡" },
  { label: "Model", icon: "🤖" },
  { label: "Pipeline", icon: "⚙️" },
  { label: "Customize", icon: "🧩" },
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

const SEVERITY_FILL: Record<Severity, string> = {
  [SEVERITIES.CRITICAL]: "bg-severity-critical text-white",
  [SEVERITIES.HIGH]: "bg-severity-high text-white",
  [SEVERITIES.MEDIUM]: "bg-severity-medium text-void",
  [SEVERITIES.LOW]: "bg-severity-low text-white",
};

const DEFAULT_CONFIG: PipelineConfig = {
  projectPath: "",
  appUrl: "http://localhost:3000",
  inspiration: "",
  maxCycles: 10,
  model: "claude-opus-4.6-1m",
  autoApprove: true,
  infiniteSessions: true,
  fixSeverity: SEVERITIES.HIGH,
  enableResearcher: true,
  enableExplorer: true,
  enableAnalyst: true,
  enableFixer: true,
  enableUxReviewer: true,
  enableCodeSimplifier: true,
  enableConsolidator: true,
  enableDomainUI: true,
  enableDomainBackend: true,
  enableDomainDatabase: true,
  enableDomainDocs: true,
  enableWorktreeIsolation: false,
  agentGraph: [],
  skills: [],
  customAgentDefinitions: [],
  mcpServerOverrides: [],
  toolOverrides: [],
};

const SPRING = { type: "spring" as const, stiffness: 400, damping: 28 };

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -200 : 200, opacity: 0 }),
};

// ─── Component ───────────────────────────────────────────────────────────────

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [config, setConfig] = useState<PipelineConfig>({ ...DEFAULT_CONFIG });
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

  // Check if there's an existing config we can go back to
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: { config: PipelineConfig | null }) => {
        if (data.config) setHasExistingConfig(true);
      })
      .catch(() => {});
  }, []);

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
      default:
        return true;
    }
  }, [step, config]);

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(5, s + 1));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const goToStep = (i: number) => {
    if (i < step) {
      setDirection(-1);
      setStep(i);
    }
  };

  const [browsing, setBrowsing] = useState(false);
  const [pathValidation, setPathValidation] = useState<{
    exists: boolean;
    isDirectory: boolean;
    projectType: string | null;
    isEmpty: boolean;
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const validateTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (validateTimer.current) clearTimeout(validateTimer.current);

    const trimmed = config.projectPath.trim();
    if (!trimmed) {
      setPathValidation(null);
      return;
    }

    setValidating(true);
    validateTimer.current = setTimeout(async () => {
      const result = await validatePath(trimmed);
      setPathValidation(result);
      setValidating(false);
    }, 400);

    return () => {
      if (validateTimer.current) clearTimeout(validateTimer.current);
    };
  }, [config.projectPath]);

  const handleBrowse = async () => {
    setBrowsing(true);
    try {
      const result = await openFolderPicker();
      if (result.path) {
        update("projectPath", result.path);
      }
    } catch {
      // Dialog failed or was cancelled
    } finally {
      setBrowsing(false);
    }
  };

  const handleLaunch = async () => {
    setLaunching(true);
    setError(null);

    try {
      const settingsRes = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!settingsRes.ok) {
        const errData = (await settingsRes.json()) as { error?: string };
        throw new Error(errData.error ?? "Failed to save settings");
      }

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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,229,255,0.05)_0%,transparent_60%)]" />

      <div className="relative z-10 w-full max-w-xl">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="mb-8 text-center"
        >
          <h1 className="text-2xl font-bold uppercase tracking-[0.2em] text-accent">
            Endstate
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Define the outcome. Endstate handles the rest.
          </p>
        </motion.div>

        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-1">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center">
              <motion.button
                whileHover={i < step ? { scale: 1.05 } : undefined}
                whileTap={i < step ? { scale: 0.95 } : undefined}
                onClick={() => goToStep(i)}
                disabled={i >= step}
                title={s.label}
                className="relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors"
              >
                {/* Active step glow ring */}
                {i === step && (
                  <motion.div
                    layoutId="step-ring"
                    className="absolute inset-0 rounded-full border border-accent/50 bg-accent/10"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    style={{ boxShadow: "0 0 12px rgba(0,229,255,0.2)" }}
                  />
                )}
                {/* Completed check */}
                {i < step ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="relative z-10 text-xs text-status-live"
                  >
                    ✓
                  </motion.span>
                ) : (
                  <span className={`relative z-10 text-xs ${i === step ? "text-accent" : "text-text-muted/60"}`}>
                    {s.icon}
                  </span>
                )}
                <span
                  className={`relative z-10 text-[10px] uppercase tracking-wider ${
                    i === step ? "text-accent" : i < step ? "text-text-secondary" : "text-text-muted/60"
                  }`}
                >
                  {s.label}
                </span>
              </motion.button>
              {i < STEPS.length - 1 && (
                <motion.div
                  className="mx-1 h-px w-6"
                  animate={{
                    backgroundColor: i < step ? "rgba(0,229,255,0.5)" : "rgba(255,255,255,0.04)",
                  }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="glass-panel overflow-hidden rounded-2xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="max-h-[60vh] overflow-y-auto p-6"
            >
              {/* Step 0: Project Path */}
              {step === 0 && (
                <div>
                  <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-text-primary">
                    Project Path
                  </h2>
                  <p className="mb-4 text-xs text-text-muted">
                    Point to any project folder. Existing code will be analyzed
                    and improved. An empty folder starts from scratch.
                  </p>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={config.projectPath}
                          onChange={(e) => update("projectPath", e.target.value)}
                          placeholder={typeof navigator !== "undefined" && navigator.platform?.startsWith("Win") ? "C:\\Users\\you\\project" : "~/your/project"}
                          className={`w-full rounded-xl border bg-void/50 px-4 py-3 pr-10 font-mono text-sm text-text-primary placeholder:text-text-muted/30 focus:outline-none focus:ring-1 focus:shadow-[inset_0_1px_4px_rgba(0,0,0,0.3)] ${
                            pathValidation?.exists && pathValidation.isDirectory
                              ? "border-status-live/50 focus:border-status-live/70 focus:ring-status-live/20"
                              : pathValidation && config.projectPath.trim()
                                ? "border-severity-critical/50 focus:border-severity-critical/70 focus:ring-severity-critical/20"
                                : "border-border-subtle focus:border-accent/50 focus:ring-accent/20"
                          }`}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {validating ? (
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-text-muted/30 border-t-accent" />
                          ) : pathValidation?.exists && pathValidation.isDirectory ? (
                            <span className="text-status-live">✓</span>
                          ) : pathValidation && config.projectPath.trim() ? (
                            <span className="text-severity-critical">✗</span>
                          ) : null}
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(0,229,255,0.15)" }}
                        whileTap={{ scale: 0.95 }}
                        transition={SPRING}
                        type="button"
                        onClick={handleBrowse}
                        disabled={browsing}
                        title="Open folder picker"
                        className="shrink-0 rounded-xl border border-border-subtle bg-void/50 px-3 py-3 text-text-secondary transition-colors hover:border-accent/50 hover:bg-accent/5 hover:text-accent disabled:opacity-50"
                      >
                        {browsing ? (
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-text-muted border-t-accent" />
                        ) : (
                          "📂"
                        )}
                      </motion.button>
                    </div>

                    {/* Browse waiting state */}
                    <AnimatePresence>
                      {browsing && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="glass-panel flex items-center gap-2 rounded-xl px-3 py-2">
                            <motion.span
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className="inline-block h-2 w-2 rounded-full bg-accent"
                            />
                            <motion.span
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                              className="inline-block h-2 w-2 rounded-full bg-accent"
                            />
                            <motion.span
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                              className="inline-block h-2 w-2 rounded-full bg-accent"
                            />
                            <span className="ml-1 text-xs text-accent">
                              Waiting for folder selection…
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Validation feedback */}
                    <AnimatePresence mode="wait">
                      {pathValidation?.exists && pathValidation.isDirectory && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="flex items-center gap-2 rounded-xl border border-status-live/20 bg-status-live/5 px-3 py-2"
                        >
                          <span className="text-xs text-status-live">✓</span>
                          <span className="text-xs text-text-secondary">
                            {pathValidation.isEmpty ? (
                              <>Empty folder — agents will <strong className="text-text-primary">build from scratch</strong></>
                            ) : pathValidation.projectType ? (
                              <>
                                <span className="rounded-full bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent">
                                  {pathValidation.projectType}
                                </span>{" "}
                                project detected — agents will <strong className="text-text-primary">analyze &amp; improve</strong>
                              </>
                            ) : (
                              <>Folder found — agents will <strong className="text-text-primary">explore &amp; analyze</strong></>
                            )}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {pathValidation && !pathValidation.exists && config.projectPath.trim() && (
                      <p className="text-[11px] text-severity-critical">
                        Path not found. Check the path and try again.
                      </p>
                    )}

                    {pathValidation && pathValidation.exists && !pathValidation.isDirectory && (
                      <p className="text-[11px] text-severity-critical">
                        This is a file, not a folder. Please select a directory.
                      </p>
                    )}

                    {!browsing && !pathValidation && (
                      <p className="text-[11px] text-text-muted">
                        Type the full path or click 📂 to open the folder picker
                      </p>
                    )}

                    <input
                      type="text"
                      value={config.appUrl}
                      onChange={(e) => update("appUrl", e.target.value)}
                      placeholder="http://localhost:3000"
                      className="w-full rounded-xl border border-border-subtle bg-void/50 px-4 py-3 font-mono text-sm text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:shadow-[inset_0_1px_4px_rgba(0,0,0,0.3)] focus:outline-none focus:ring-1 focus:ring-accent/20"
                    />
                    <p className="text-[11px] text-text-muted">
                      URL where the running app can be accessed by agents
                    </p>
                  </div>
                </div>
              )}

              {/* Step 1: Inspiration */}
              {step === 1 && (
                <div>
                  <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-text-primary">
                    Vision &amp; Inspiration
                  </h2>
                  <p className="mb-4 text-xs text-text-muted">
                    Describe what you want the agents to do. This guides all agent
                    behavior throughout the pipeline.
                  </p>

                  {/* Scenario chips */}
                  <motion.div
                    variants={{ show: { transition: { staggerChildren: 0.05 } } }}
                    initial="hidden"
                    animate="show"
                    className="mb-4 grid grid-cols-2 gap-2"
                  >
                    {SCENARIO_TEMPLATES.map((scenario) => {
                      const isSelected = config.inspiration === scenario.value && scenario.value;
                      return (
                        <motion.button
                          key={scenario.label}
                          variants={{
                            hidden: { opacity: 0, y: 8 },
                            show: { opacity: 1, y: 0 },
                          }}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          transition={SPRING}
                          onClick={() => {
                            if (scenario.value) {
                              update("inspiration", scenario.value);
                            }
                          }}
                          className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left text-xs transition-colors ${
                            isSelected
                              ? "glass-panel border-accent/40 text-accent"
                              : "border-border-subtle bg-void/30 text-text-secondary hover:border-border-active"
                          }`}
                          style={isSelected ? { boxShadow: "0 0 15px rgba(0,229,255,0.1)" } : undefined}
                        >
                          <span className="text-base">{scenario.icon}</span>
                          <span className="font-medium">{scenario.label}</span>
                        </motion.button>
                      );
                    })}
                  </motion.div>

                  <textarea
                    value={config.inspiration}
                    onChange={(e) => update("inspiration", e.target.value)}
                    placeholder="Describe your vision in detail. What are you building? Who is it for? What should the agents focus on?"
                    rows={6}
                    className="w-full resize-none rounded-xl border border-border-subtle bg-void/50 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:shadow-[inset_0_1px_4px_rgba(0,0,0,0.3)] focus:outline-none focus:ring-1 focus:ring-accent/20"
                  />
                </div>
              )}

              {/* Step 2: Model Selection */}
              {step === 2 && (
                <div>
                  <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-text-primary">
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
                  <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-text-primary">
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
                        <span className="font-mono text-sm font-bold text-accent">
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
                      <div className="mt-0.5 flex justify-between text-[11px] text-text-muted">
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
                          <motion.button
                            key={sev}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={SPRING}
                            onClick={() => update("fixSeverity", sev)}
                            className={`flex-1 rounded-full py-2 text-[11px] font-bold transition-colors ${
                              config.fixSeverity === sev
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
                    <div>
                      <label className="mb-2 block text-xs text-text-secondary">
                        Core Agents
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <AgentToggle label="Explorer" color="bg-agent-explorer" glowColor="rgba(0,229,255,0.4)" checked={config.enableExplorer} onChange={(v) => update("enableExplorer", v)} />
                        <AgentToggle label="UX Reviewer" color="bg-agent-ux" glowColor="rgba(255,184,0,0.4)" checked={config.enableUxReviewer} onChange={(v) => update("enableUxReviewer", v)} />
                        <AgentToggle label="Consolidator" color="bg-agent-consolidator" glowColor="rgba(255,215,0,0.4)" checked={config.enableConsolidator} onChange={(v) => update("enableConsolidator", v)} />
                        <AgentToggle label="Simplifier" color="bg-agent-simplifier" glowColor="rgba(255,105,180,0.4)" checked={config.enableCodeSimplifier} onChange={(v) => update("enableCodeSimplifier", v)} />
                      </div>
                    </div>

                    {/* Domain streams */}
                    <div>
                      <label className="mb-1 block text-xs text-text-secondary">
                        Domain Streams
                      </label>
                      <p className="mb-2 text-[10px] text-text-muted/60">
                        Each enables a paired Analyst + Fixer
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <AgentToggle label="UI" color="bg-agent-analyst-ui" glowColor="rgba(0,229,255,0.4)" checked={config.enableDomainUI} onChange={(v) => update("enableDomainUI", v)} />
                        <AgentToggle label="Backend" color="bg-agent-analyst-backend" glowColor="rgba(176,38,255,0.4)" checked={config.enableDomainBackend} onChange={(v) => update("enableDomainBackend", v)} />
                        <AgentToggle label="Database" color="bg-agent-analyst-database" glowColor="rgba(255,215,0,0.4)" checked={config.enableDomainDatabase} onChange={(v) => update("enableDomainDatabase", v)} />
                        <AgentToggle label="Docs" color="bg-agent-analyst-docs" glowColor="rgba(255,105,180,0.4)" checked={config.enableDomainDocs} onChange={(v) => update("enableDomainDocs", v)} />
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

              {/* Step 4: Customize */}
              {step === 4 && (
                <div>
                  <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-text-primary">
                    Customize
                  </h2>
                  <p className="mb-4 text-xs text-text-muted">
                    Configure skills, MCP servers, and tool access before launching. You can fine-tune these later in Settings.
                  </p>

                  <div className="space-y-2">
                    <CollapsibleSection icon="🧩" label="Skills" count={config.skills.length}>
                      <SkillManager
                        skills={config.skills}
                        onChange={(v) => update("skills", v)}
                        projectPath={config.projectPath}
                      />
                    </CollapsibleSection>
                    <CollapsibleSection icon="🔌" label="MCP Servers" count={config.mcpServerOverrides.length}>
                      <McpServerManager
                        servers={config.mcpServerOverrides}
                        onChange={(v) => update("mcpServerOverrides", v)}
                        projectPath={config.projectPath}
                      />
                    </CollapsibleSection>
                    <CollapsibleSection icon="🔧" label="Tool Access" count={config.toolOverrides.length}>
                      <ToolManager
                        tools={config.toolOverrides}
                        onChange={(v) => update("toolOverrides", v)}
                      />
                    </CollapsibleSection>
                  </div>
                </div>
              )}

              {/* Step 5: Confirmation */}
              {step === 5 && (
                <div>
                  <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-text-primary">
                    Ready to Launch
                  </h2>
                  <p className="mb-4 text-xs text-text-muted">
                    Review your configuration and start the autonomous pipeline.
                  </p>

                  {/* Summary */}
                  <div className="glass-panel mb-5 space-y-2 rounded-xl p-4">
                    <SummaryRow label="Project" value={config.projectPath} />
                    <SummaryRow label="App URL" value={config.appUrl} />
                    <SummaryRow label="Model" value={config.model} />
                    <SummaryRow label="Max Cycles" value={String(config.maxCycles)} />
                    <SummaryRow label="Fix Threshold" value={config.fixSeverity} />
                    <SummaryRow
                      label="Agents"
                      value={[
                        config.enableResearcher && "Researcher",
                        config.enableExplorer && "Explorer",
                        config.enableUxReviewer && "UX",
                        config.enableCodeSimplifier && "Simplifier",
                        config.enableConsolidator && "Consolidator",
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    />
                    <SummaryRow
                      label="Domains"
                      value={[
                        config.enableDomainUI && "UI",
                        config.enableDomainBackend && "Backend",
                        config.enableDomainDatabase && "Database",
                        config.enableDomainDocs && "Docs",
                      ]
                        .filter(Boolean)
                        .join(", ") || "None"}
                    />
                    {config.enableWorktreeIsolation && (
                      <SummaryRow label="Isolation" value="Worktree isolation enabled" />
                    )}
                    <SummaryRow
                      label="Vision"
                      value={
                        config.inspiration.length > 100
                          ? config.inspiration.slice(0, 100) + "…"
                          : config.inspiration
                      }
                    />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mb-3 text-xs text-severity-critical"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.button
                    whileHover={{
                      scale: 1.02,
                      boxShadow: "0 0 30px rgba(0,229,255,0.3)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING}
                    onClick={handleLaunch}
                    disabled={launching}
                    className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-accent to-[#00B8D4] py-3.5 text-sm font-bold uppercase tracking-wider text-void transition-all disabled:opacity-60"
                  >
                    {/* Pulsing glow ring when ready */}
                    {!launching && (
                      <motion.div
                        animate={{
                          boxShadow: [
                            "0 0 0 0 rgba(0,229,255,0)",
                            "0 0 0 8px rgba(0,229,255,0.1)",
                            "0 0 0 0 rgba(0,229,255,0)",
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-xl"
                      />
                    )}
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
                  </motion.button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-border-subtle px-6 py-4">
            <motion.button
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={step === 0 && hasExistingConfig ? () => router.push("/") : goBack}
              disabled={step === 0 && !hasExistingConfig}
              className="text-xs text-text-muted transition-colors hover:text-text-primary disabled:invisible"
            >
              {step === 0 && hasExistingConfig ? "← Dashboard" : "← Back"}
            </motion.button>

            {step < 5 && (
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(0,229,255,0.15)" }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING}
                onClick={goNext}
                disabled={!canAdvance()}
                className="rounded-xl bg-accent/10 px-8 py-2.5 text-sm font-bold uppercase tracking-wider text-accent transition-all hover:bg-accent/20 disabled:opacity-30"
              >
                Next →
              </motion.button>
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
  glowColor,
  checked,
  onChange,
}: {
  label: string;
  color: string;
  glowColor: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={SPRING}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs transition-colors ${
        checked
          ? "border-accent/30 bg-accent/5 text-text-primary"
          : "border-border-subtle bg-void/30 text-text-muted"
      }`}
      style={checked ? { boxShadow: `inset 3px 0 0 ${glowColor}` } : undefined}
    >
      <motion.div
        animate={{
          opacity: checked ? 1 : 0.3,
          scale: checked ? 1 : 0.7,
        }}
        transition={SPRING}
        className={`h-2.5 w-2.5 rounded-full ${color}`}
        style={checked ? { boxShadow: `0 0 8px ${glowColor}` } : undefined}
      />
      {label}
    </motion.button>
  );
}

function CollapsibleSection({
  icon,
  label,
  count,
  children,
}: {
  icon: string;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border-subtle overflow-hidden">
      <motion.button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
        whileTap={{ scale: 0.99 }}
      >
        <span className="text-sm">{icon}</span>
        <span className="flex-1 text-xs font-medium text-text-secondary">{label}</span>
        {count > 0 && (
          <span className="rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[10px] text-accent">
            {count}
          </span>
        )}
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="h-3.5 w-3.5 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </motion.svg>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-subtle px-4 py-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-20 shrink-0 text-[11px] uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <span className="font-mono text-xs text-text-secondary">
        {value}
      </span>
    </div>
  );
}