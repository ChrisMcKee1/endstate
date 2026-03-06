"use client";

import { useState, useCallback, type FormEvent } from "react";
import { motion } from "framer-motion";
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
    <div className="glass-panel border-t-0 shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
      {/* Quick chips */}
      <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-2">
        {QUICK_CHIPS.map((chip) => (
          <motion.button
            key={chip.label}
            whileHover={{ scale: 1.04, boxShadow: "0 0 12px rgba(0, 229, 255, 0.15)" }}
            whileTap={{ scale: 0.96 }}
            onClick={() => send(chip.message)}
            disabled={sending || !isRunning}
            className="shrink-0 rounded-full border border-border-active bg-white/[0.03] px-3.5 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:border-accent/30 hover:text-accent disabled:opacity-30"
          >
            {chip.label}
          </motion.button>
        ))}
      </div>

      {/* Input row */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 px-4 pb-3"
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
            className="w-full rounded-full border border-border-active bg-void/60 px-5 py-3 font-mono text-sm text-text-primary placeholder:text-text-muted/40 transition-shadow focus:border-accent/40 focus:shadow-[inset_0_0_20px_rgba(0,229,255,0.06),0_0_16px_rgba(0,229,255,0.08)] focus:outline-none disabled:opacity-30"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(message);
              }
            }}
          />
          {lastSent && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-status-live"
            >
              Sent ✓
            </motion.span>
          )}
        </div>

        <motion.button
          type="submit"
          disabled={!message.trim() || sending || !isRunning}
          whileHover={{ scale: 1.08, boxShadow: "0 0 20px rgba(0, 229, 255, 0.4)" }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent transition-colors hover:bg-accent/25 disabled:opacity-20"
        >
          {sending ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              className="h-4 w-4 rounded-full border-2 border-transparent border-t-accent"
            />
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
        </motion.button>
      </form>
    </div>
  );
}
