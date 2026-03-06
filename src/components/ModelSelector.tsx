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
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data: { models?: ModelInfo[] }) => {
        if (data.models) setModels(data.models);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
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

  const formatTokens = (n: number | undefined) => {
    if (!n) return "—";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    return `${(n / 1_000).toFixed(0)}K`;
  };

  return (
    <div ref={dropdownRef} className="relative">
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
              <p className="text-[10px] text-text-muted">
                {selected.vendor} · {formatTokens(selected.modelCapabilities?.modelLimits?.maxContextWindowTokens)} ctx
              </p>
            </div>
          </>
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

      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border-subtle bg-surface shadow-lg animate-fade-in">
          {models.map((model) => (
            <button
              key={model.id}
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
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-text-muted">
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
    </div>
  );
}
