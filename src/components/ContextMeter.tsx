"use client";

interface ContextMeterProps {
  usage: number; // 0-1
  isCompacting: boolean;
}

export function ContextMeter({ usage, isCompacting }: ContextMeterProps) {
  const pct = Math.round(usage * 100);

  const color =
    pct < 50
      ? "bg-status-live"
      : pct < 75
        ? "bg-severity-medium"
        : pct < 90
          ? "bg-severity-high"
          : "bg-severity-critical";

  const textColor =
    pct < 50
      ? "text-status-live"
      : pct < 75
        ? "text-severity-medium"
        : pct < 90
          ? "text-severity-high"
          : "text-severity-critical";

  return (
    <div
      className={`flex items-center gap-2 ${isCompacting ? "animate-compaction-pulse" : ""}`}
      title={`Context: ${pct}%${isCompacting ? " (compacting…)" : ""}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-[family-name:var(--font-display)] text-[9px] uppercase tracking-widest text-text-muted">
          CTX
        </span>
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-void/80">
          <div
            className={`h-full rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className={`font-[family-name:var(--font-code)] text-[10px] font-bold ${textColor}`}
        >
          {pct}%
        </span>
      </div>

      {isCompacting && (
        <span className="text-[9px] text-agent-ux animate-pulse">
          Compacting
        </span>
      )}
    </div>
  );
}
