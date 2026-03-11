// Asset: Manual Compaction Control
// Trigger compaction proactively instead of waiting for automatic thresholds.
// Reference: references/api-surface.md → session.rpc.compaction

import type { CopilotSession } from "@github/copilot-sdk";

// ─── Pattern: Monitor context and trigger compaction before hitting limits ────

export async function monitorAndCompact(session: CopilotSession) {
  // session.usage_info provides live context window state
  session.on("session.usage_info", async (event) => {
    const utilization = event.currentTokens / event.tokenLimit;

    // Trigger manual compaction at 80% instead of waiting for SDK threshold (90%)
    if (utilization > 0.8) {
      console.log(
        `Context at ${(utilization * 100).toFixed(0)}% — triggering manual compaction`,
      );
      await session.rpc.compaction.compact();
    }
  });

  // Track compaction results
  session.on("session.compaction_complete", (event) => {
    console.log(
      `Compaction freed ${event.tokensFreed} tokens, now at ${event.tokensAfterCompaction}`,
    );
  });
}

// ─── Pattern: Force compaction before a large prompt ─────────────────────────

export async function compactBeforeLargePrompt(
  session: CopilotSession,
  largePrompt: string,
) {
  // If the prompt is large, compact first to make room
  if (largePrompt.length > 50_000) {
    await session.rpc.compaction.compact();
  }
  return session.sendAndWait({ prompt: largePrompt });
}
