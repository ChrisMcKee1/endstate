"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types (from API response shape) ─────────────────────────────────────────

interface ModelInfo {
  id: string;
  name: string;
  vendor: string;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  preview?: boolean;
  modelCapabilities?: {
    modelSupports?: {
      supportsVision?: boolean;
      supportsReasoningEffort?: boolean;
    };
    modelLimits?: {
      maxContextWindowTokens?: number;
    };
  };
  modelBilling?: {
    multiplier?: number;
  };
}

const VENDOR_ICONS: Record<string, string> = {
  anthropic: "🟠",
  openai: "🟢",
  google: "🔵",
  microsoft: "🟣",
  meta: "⚪",
};

const VENDOR_COLORS: Record<string, string> = {
  anthropic: "rgba(255, 160, 60, 0.4)",
  openai: "rgba(0, 200, 100, 0.4)",
  google: "rgba(60, 120, 255, 0.4)",
  microsoft: "rgba(176, 38, 255, 0.4)",
  meta: "rgba(200, 200, 200, 0.4)",
};

const SPRING = { type: "spring" as const, stiffness: 400, damping: 25 };

// Preferred models in priority order — first match wins
const PREFERRED_MODEL_PATTERNS = [
  "claude-opus-4.6-1m",
  "claude-opus-4.6",
  "claude-opus",
  "claude-sonnet",
  "gpt-5",
  "gpt-4.1",
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchModels = (autoSelect = false) => {
    setLoading(true);
    setFetchError(null);
    fetch("/api/models")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { models?: ModelInfo[] }) => {
        if (data.models) {
          setModels(data.models);

          if (autoSelect) {
            // Auto-select best model if current value isn't in the list
            const currentMatch = data.models.find((m) => m.id === value);
            if (!currentMatch && data.models.length > 0) {
              for (const pattern of PREFERRED_MODEL_PATTERNS) {
                const match = data.models.find((m) =>
                  m.id.toLowerCase().includes(pattern)
                );
                if (match) {
                  onChange(match.id);
                  return;
                }
              }
              onChange(data.models[0].id);
            }
          }
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load models";
        setFetchError(msg);
      })
      .finally(() => setLoading(false));
  };

  // Initial load with auto-select
  useEffect(() => {
    fetchModels(true); // eslint-disable-line react-hooks/set-state-in-effect -- onChange runs asynchronously in fetch .then()
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = models.find((m) => m.id === value);

  useEffect(() => {
    if (open && listRef.current && value) {
      const selectedEl = listRef.current.querySelector(`[data-model-id="${CSS.escape(value)}"]`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "center" });
      }
    }
  }, [open, value]);

  const formatTokens = (n: number | undefined) => {
    if (!n) return "—";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    return `${(n / 1_000).toFixed(0)}K`;
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Error state */}
      <AnimatePresence>
        {fetchError && !manualInput && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING}
            className="glass-panel glow-error mb-2 flex items-center gap-2 rounded-xl px-3 py-2"
          >
            <span className="text-xs text-severity-critical">
              Failed to load models: {fetchError}
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchModels()}
              className="shrink-0 rounded-lg bg-status-live/10 px-2.5 py-1 text-[11px] font-medium text-status-live transition-colors hover:bg-status-live/20 hover:shadow-[0_0_12px_rgba(0,255,163,0.15)]"
            >
              Retry
            </motion.button>
            <button
              onClick={() => setManualInput(true)}
              className="shrink-0 rounded-lg bg-elevated px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-overlay"
            >
              Type manually
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual text input mode */}
      <AnimatePresence mode="wait">
        {manualInput ? (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING}
            className="flex gap-2"
          >
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g. claude-opus-4.6"
              className="flex-1 rounded-xl border border-border-subtle bg-void/50 px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:shadow-[inset_0_1px_4px_rgba(0,229,255,0.1)] focus:outline-none"
            />
            {models.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setManualInput(false)}
                className="shrink-0 rounded-xl border border-border-subtle bg-void/50 px-3 py-2 text-xs text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
              >
                Dropdown
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.div key="dropdown" initial={false}>
            {/* Trigger button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setOpen(!open)}
              disabled={loading}
              className="glass-panel flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors hover:border-border-active focus:border-accent/50 focus:outline-none"
            >
              {loading ? (
                <span className="text-xs text-text-muted">Loading models…</span>
              ) : selected ? (
                <>
                  <span className="text-sm">
                    {VENDOR_ICONS[selected.vendor] ?? "🤖"}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-primary">
                      {selected.name}
                    </p>
                    <p className="font-mono text-[11px] text-text-muted">
                      {selected.vendor} · {formatTokens(selected.modelCapabilities?.modelLimits?.maxContextWindowTokens)} ctx
                    </p>
                  </div>
                </>
              ) : value ? (
                <span className="text-xs text-text-primary">{value}</span>
              ) : (
                <span className="text-xs text-text-muted">Select a model</span>
              )}

              <motion.svg
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="h-3.5 w-3.5 shrink-0 text-text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </motion.svg>
            </motion.button>

            {/* Dropdown */}
            <AnimatePresence>
              {open && models.length > 0 && (
                <motion.div
                  ref={listRef}
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={SPRING}
                  className="glass-panel absolute z-50 mt-1.5 max-h-80 w-full overflow-y-auto rounded-xl"
                >
                  {models.map((model) => {
                    const vendorGlow = VENDOR_COLORS[model.vendor] ?? "rgba(200,200,200,0.3)";
                    return (
                      <motion.button
                        key={model.id}
                        data-model-id={model.id}
                        whileHover={{
                          backgroundColor: "rgba(255,255,255,0.03)",
                          boxShadow: `inset 3px 0 0 ${vendorGlow}`,
                        }}
                        onClick={() => {
                          onChange(model.id);
                          setOpen(false);
                        }}
                        className={`flex w-full items-center gap-2.5 border-b border-border-subtle/50 px-3 py-2.5 text-left transition-colors ${
                          model.id === value ? "bg-accent/5" : ""
                        }`}
                      >
                        <span className="text-sm">
                          {VENDOR_ICONS[model.vendor] ?? "🤖"}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-text-primary">
                              {model.name}
                            </span>
                            {model.preview && (
                              <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[8px] font-bold text-accent">
                                PREVIEW
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-text-muted">
                            <span>{model.vendor}</span>
                            <span>
                              {formatTokens(model.modelCapabilities?.modelLimits?.maxContextWindowTokens)} ctx
                            </span>
                            {model.modelBilling?.multiplier && (
                              <span>×{model.modelBilling.multiplier}</span>
                            )}
                          </div>
                        </div>

                        {/* Capability badges */}
                        <div className="flex gap-1">
                          {model.modelCapabilities?.modelSupports?.supportsVision && (
                            <span className="rounded-full bg-elevated px-1.5 py-0.5 text-[8px] text-text-muted shadow-[0_0_8px_rgba(0,229,255,0.08)]">
                              👁️
                            </span>
                          )}
                          {model.modelCapabilities?.modelSupports?.supportsReasoningEffort && (
                            <span className="rounded-full bg-elevated px-1.5 py-0.5 text-[8px] text-text-muted shadow-[0_0_8px_rgba(176,38,255,0.08)]">
                              🧠
                            </span>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}