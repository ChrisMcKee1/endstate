"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Award, AwardRarity } from "@/lib/types";
import { AWARD_RARITIES, AWARD_SOURCES } from "@/lib/types";

// ─── Rarity config ───────────────────────────────────────────────────────────

const RARITY_META: Record<
  AwardRarity,
  { label: string; border: string; bg: string; shimmer: string; glow: string; labelColor: string }
> = {
  [AWARD_RARITIES.COMMON]: {
    label: "Common",
    border: "rgba(144, 164, 174, 0.2)",
    bg: "rgba(144, 164, 174, 0.04)",
    shimmer: "rgba(144, 164, 174, 0.08)",
    glow: "rgba(144, 164, 174, 0.15)",
    labelColor: "#90A4AE",
  },
  [AWARD_RARITIES.UNCOMMON]: {
    label: "Uncommon",
    border: "rgba(0, 255, 163, 0.25)",
    bg: "rgba(0, 255, 163, 0.04)",
    shimmer: "rgba(0, 255, 163, 0.1)",
    glow: "rgba(0, 255, 163, 0.2)",
    labelColor: "#00FFA3",
  },
  [AWARD_RARITIES.RARE]: {
    label: "Rare",
    border: "rgba(0, 229, 255, 0.3)",
    bg: "rgba(0, 229, 255, 0.05)",
    shimmer: "rgba(0, 229, 255, 0.12)",
    glow: "rgba(0, 229, 255, 0.25)",
    labelColor: "#00E5FF",
  },
  [AWARD_RARITIES.EPIC]: {
    label: "Epic",
    border: "rgba(176, 38, 255, 0.35)",
    bg: "rgba(176, 38, 255, 0.06)",
    shimmer: "rgba(176, 38, 255, 0.15)",
    glow: "rgba(176, 38, 255, 0.3)",
    labelColor: "#B026FF",
  },
  [AWARD_RARITIES.LEGENDARY]: {
    label: "Legendary",
    border: "rgba(255, 184, 0, 0.4)",
    bg: "rgba(255, 184, 0, 0.07)",
    shimmer: "rgba(255, 184, 0, 0.18)",
    glow: "rgba(255, 184, 0, 0.35)",
    labelColor: "#FFB800",
  },
};

const RARITY_ORDER: AwardRarity[] = [
  AWARD_RARITIES.LEGENDARY,
  AWARD_RARITIES.EPIC,
  AWARD_RARITIES.RARE,
  AWARD_RARITIES.UNCOMMON,
  AWARD_RARITIES.COMMON,
];

// ─── Single Award Card ──────────────────────────────────────────────────────

function AwardCard({ award, index }: { award: Award; index: number }) {
  const rarity = RARITY_META[award.rarity] ?? RARITY_META[AWARD_RARITIES.COMMON];
  const isLegendary = award.rarity === AWARD_RARITIES.LEGENDARY;
  const isEpic = award.rarity === AWARD_RARITIES.EPIC;
  const isAI = award.source === AWARD_SOURCES.AI_GENERATED;

  return (
    <motion.div
      layout
      layoutId={award.id}
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
        delay: index * 0.05,
      }}
      className="group relative overflow-hidden rounded-xl"
      style={{
        background: rarity.bg,
        border: `1px solid ${rarity.border}`,
      }}
    >
      {/* Shimmer sweep — more dramatic for higher rarities */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(110deg, transparent 25%, ${rarity.shimmer} 50%, transparent 75%)`,
          backgroundSize: "200% 100%",
        }}
        animate={{
          backgroundPosition: ["-100% 0%", "200% 0%"],
        }}
        transition={{
          duration: isLegendary ? 3 : isEpic ? 4 : 6,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: isLegendary ? 1 : 3,
        }}
      />

      {/* Legendary: ambient glow border pulse */}
      {isLegendary && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl"
          animate={{
            boxShadow: [
              `inset 0 0 0px ${rarity.glow}`,
              `inset 0 0 20px ${rarity.glow}`,
              `inset 0 0 0px ${rarity.glow}`,
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className="relative flex items-start gap-3 p-3">
        {/* Icon */}
        <motion.div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl"
          style={{
            background: rarity.bg,
            boxShadow: `0 0 12px ${rarity.glow}`,
          }}
          whileHover={{ scale: 1.15, rotate: [0, -8, 8, 0] }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          {award.icon}
        </motion.div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold"
              style={{ color: award.color }}
            >
              {award.title}
            </span>
            {isAI && (
              <span
                className="rounded-full px-1.5 py-px text-[7px] font-semibold uppercase tracking-widest"
                style={{
                  background: "rgba(176, 38, 255, 0.12)",
                  color: "#B026FF",
                  border: "1px solid rgba(176, 38, 255, 0.2)",
                }}
              >
                AI
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] leading-relaxed text-text-secondary">
            {award.description}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className="rounded-full px-1.5 py-px text-[7px] font-semibold uppercase tracking-[0.12em]"
              style={{
                background: rarity.bg,
                color: award.color,
                border: `1px solid ${rarity.border}`,
              }}
            >
              {RARITY_META[award.rarity]?.label ?? award.rarity}
            </span>
            <span className="text-[8px] text-text-muted/50">
              {new Date(award.earnedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <motion.div
        className="text-4xl"
        animate={{
          rotate: [0, -5, 5, -3, 3, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        🏆
      </motion.div>
      <p className="text-xs font-semibold text-text-secondary">
        No awards yet
      </p>
      <p className="text-[10px] text-text-muted max-w-[200px]">
        Start the pipeline and earn awards as agents discover, fix, and verify
        issues.
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AwardsPanel() {
  const [awards, setAwards] = useState<Award[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(0);

  // Poll for predefined awards every 5s
  useEffect(() => {
    const fetchAwards = () => {
      fetch("/api/awards")
        .then((r) => r.json())
        .then((data: { awards?: Award[] }) => {
          if (data.awards) setAwards(data.awards);
        })
        .catch(() => {});
    };

    fetchAwards();
    const interval = setInterval(fetchAwards, 5_000);
    return () => clearInterval(interval);
  }, []);

  // Request AI-generated awards
  const generateAIAwards = useCallback(async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/awards", { method: "POST" });
      const data: { awards?: Award[]; generated?: number } = await res.json();
      if (data.awards) {
        setAwards(data.awards);
        setLastGenerated(data.generated ?? 0);
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Group awards by rarity for display
  const grouped = RARITY_ORDER.map((rarity) => ({
    rarity,
    awards: awards.filter((a) => a.rarity === rarity),
  })).filter((g) => g.awards.length > 0);

  const totalCount = awards.length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm">🏆</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Awards
          </span>
          {totalCount > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent/10 px-1 font-mono text-[9px] text-accent">
              {totalCount}
            </span>
          )}
        </div>

        {/* AI Generate button */}
        <motion.button
          onClick={generateAIAwards}
          disabled={isGenerating}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-text-secondary transition-colors hover:border-accent/20 hover:bg-accent/5 hover:text-accent disabled:opacity-40"
        >
          {isGenerating ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                ✨
              </motion.span>
              <span>Generating…</span>
            </>
          ) : (
            <>
              <span>✨</span>
              <span>AI Awards</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Awards list */}
      <div className="flex-1 overflow-y-auto p-3">
        {totalCount === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {/* Rarity groups */}
            {grouped.map(({ rarity, awards: groupAwards }) => (
              <div key={rarity}>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="text-[8px] font-bold uppercase tracking-[0.15em]"
                    style={{
                      color: RARITY_META[rarity]?.labelColor ?? "#90A4AE",
                    }}
                  >
                    {RARITY_META[rarity]?.label ?? rarity}
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{
                      background: RARITY_META[rarity]?.border ?? "rgba(255,255,255,0.06)",
                    }}
                  />
                  <span className="font-mono text-[8px] text-text-muted/40">
                    {groupAwards.length}
                  </span>
                </div>
                <AnimatePresence mode="popLayout">
                  <div className="space-y-2">
                    {groupAwards.map((award, i) => (
                      <AwardCard key={award.id} award={award} index={i} />
                    ))}
                  </div>
                </AnimatePresence>
              </div>
            ))}

            {/* AI generation feedback */}
            <AnimatePresence>
              {lastGenerated > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg border border-accent/10 bg-accent/5 p-2.5 text-center"
                >
                  <span className="text-[10px] text-accent">
                    ✨ {lastGenerated} AI award
                    {lastGenerated > 1 ? "s" : ""} generated
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
