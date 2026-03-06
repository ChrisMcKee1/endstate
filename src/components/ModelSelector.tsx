"use client";

import { useState, useEffect, useRef } from "react";

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

  const fetchModels = () => {
    setLoading(true);
    setFetchError(null);
    fetch("/api/models")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { models?: ModelInfo[] }) => {
        if (data.models) setModels(data.models);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load models";
        setFetchError(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // Close on outside click
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

  // Auto-scroll to selected model when dropdown opens
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
      {fetchError && !manualInput && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-severity-critical/30 bg-severity-critical/5 px-3 py-2">
          <span className="text-xs text-severity-critical">Failed to load models: {fetchError}</span>
          <button
            onClick={fetchModels}
            className="shrink-0 rounded bg-severity-critical/10 px-2 py-0.5 text-[11px] font-medium text-severity-critical transition-colors hover:bg-severity-critical/20"
          >
            Retry
          </button>
          <button
            onClick={() => setManualInput(true)}
            className="shrink-0 rounded bg-elevated px-2 py-0.5 text-[11px] font-medium text-text-secondary transition-colors hover:bg-overlay"
          >
            Type manually
          </button>
        </div>
      )}

      {/* Manual text input mode */}
      {manualInput ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. claude-opus-4.6"
            className="flex-1 rounded-lg border border-border-subtle bg-void/50 px-3 py-2 font-[family-name:var(--font-code)] text-sm text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
          {models.length > 0 && (
            <button
              onClick={() => setManualInput(false)}
              className="shrink-0 rounded-lg border border-border-subtle bg-void/50 px-3 py-2 text-xs text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
            >
              Dropdown
            </button>
          )}
        </div>
      ) : (
        <>
          <button
            onClick={() => setOpen(!open)}
            disabled={loading}
            className="flex w-full items-center gap-2 rounded-lg border border-border-subtle bg-void/50 px-3 py-2 text-left transition-colors hover:border-border-active focus:border-accent/50 focus:outline-none"
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
                  <p className="text-[11px] text-text-muted">
                    {selected.vendor} · {formatTokens(selected.modelCapabilities?.modelLimits?.maxContextWindowTokens)} ctx
                  </p>
                </div>
              </>
            ) : value ? (
              <span className="text-xs text-text-primary">{value}</span>
            ) : (
              <span className="text-xs text-text-muted">Select a model</span>
            )}

            <svg
              className={`h-3 w-3 shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
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
            </svg>
          </button>

          {open && models.length > 0 && (
            <div ref={listRef} className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-border-subtle bg-surface shadow-lg animate-fade-in">
              {models.map((model) => (
                <button
                  key={model.id}
                  data-model-id={model.id}
                  onClick={() => {
                    onChange(model.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 border-b border-border-subtle/50 px-3 py-2.5 text-left transition-colors hover:bg-elevated ${
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
                        <span className="rounded bg-accent/10 px-1 py-0.5 text-[8px] font-bold text-accent">
                          PREVIEW
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-text-muted">
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
                      <span className="rounded bg-elevated px-1 py-0.5 text-[8px] text-text-muted">
                        👁️
                      </span>
                    )}
                    {model.modelCapabilities?.modelSupports?.supportsReasoningEffort && (
                      <span className="rounded bg-elevated px-1 py-0.5 text-[8px] text-text-muted">
                        🧠
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
