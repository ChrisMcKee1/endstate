"use client";

interface ContextMeterProps {
  usage: number; // 0-1
  isCompacting: boolean;
}

function meterColor(pct: number): string {
  if (pct < 50) return "bg-status-live";
  if (pct < 75) return "bg-severity-medium";
  if (pct < 90) return "bg-severity-high";
  return "bg-severity-critical";
}

function meterTextColor(pct: number): string {
  if (pct < 50) return "text-status-live";
  if (pct < 75) return "text-severity-medium";
  if (pct < 90) return "text-severity-high";
  return "text-severity-critical";
}

export function ContextMeter({ usage, isCompacting }: ContextMeterProps) {
  const pct = Math.round(usage * 100);
  const color = meterColor(pct);
  const textColor = meterTextColor(pct);

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
