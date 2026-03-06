"use client";

import { useState, useCallback, type FormEvent } from "react";
import type { PipelineStatus } from "@/lib/types";
import { PIPELINE_STATUSES } from "@/lib/types";

const QUICK_CHIPS = [
  { label: "Skip to UX review", message: "Skip remaining steps and go directly to UX review" },
  { label: "Focus on errors", message: "Focus on critical errors and bugs only" },
  { label: "Security checks", message: "Run a security-focused review pass" },
  { label: "Test mobile", message: "Test mobile viewport and responsive layouts" },
  { label: "+5 cycles", message: "Increase the remaining cycles by 5" },
] as const;

interface SteeringBarProps {
  status: PipelineStatus;
}

export function SteeringBar({ status }: SteeringBarProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);

  const isRunning = status === PIPELINE_STATUSES.RUNNING;

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || sending) return;
      setSending(true);
      setLastSent(null);

      try {
        const res = await fetch("/api/pipeline/steer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text.trim() }),
        });

        if (res.ok) {
          setLastSent(text.trim());
          setMessage("");
        }
      } catch {
        /* network error — silent */
      } finally {
        setSending(false);
      }
    },
    [sending],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(message);
  };

  return (
    <div className="border-t border-border-subtle bg-surface/80 backdrop-blur-sm">
      {/* Quick chips */}
      <div className="flex gap-1.5 overflow-x-auto px-4 pt-2 pb-1.5">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => send(chip.message)}
            disabled={sending || !isRunning}
            className="shrink-0 rounded-full border border-border-subtle bg-elevated px-3 py-1 text-[10px] text-text-muted transition-all hover:border-accent/30 hover:text-accent disabled:opacity-40"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input row */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 pb-3"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              isRunning
                ? "Steer the pipeline — e.g. 'Focus on accessibility'"
                : "Pipeline is not running"
            }
            disabled={!isRunning || sending}
            className="w-full rounded-lg border border-border-subtle bg-void/50 px-4 py-2.5 font-[family-name:var(--font-code)] text-sm text-text-primary placeholder:text-text-muted/40 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20 disabled:opacity-40"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(message);
              }
            }}
          />
          {lastSent && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-status-live animate-fade-in">
              Sent ✓
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={!message.trim() || sending || !isRunning}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent transition-all hover:bg-accent/20 disabled:opacity-30"
        >
          {sending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-accent" />
          ) : (
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
