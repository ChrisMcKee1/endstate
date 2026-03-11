// Asset: Native Token Tracking via assistant.usage Event
// The SDK emits per-call token usage — use this instead of manual estimation.
// Reference: references/session-events.md → assistant.usage

import type { CopilotSession } from "@github/copilot-sdk";

interface TokenMetrics {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  cost: number;
  durationMs: number;
}

// ─── Pattern: Track tokens per agent session ──────────────────────────────────

export function trackTokenUsage(session: CopilotSession, agentRole: string) {
  const metrics: TokenMetrics[] = [];

  // assistant.usage fires after each LLM call with exact token counts
  session.on("assistant.usage", (event) => {
    metrics.push({
      model: event.model,
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
      cacheReadTokens: event.cacheReadTokens ?? 0,
      cacheWriteTokens: event.cacheWriteTokens ?? 0,
      cost: event.cost ?? 0,
      durationMs: event.duration ?? 0,
    });

    // Feed to OTel counters
    recordAgentTokens(agentRole, event.inputTokens, event.outputTokens);

    // Quota snapshot is also available per-call:
    // event.quotaSnapshots → [{ quotaType, entitlement, used, percentageUsed, resetDate }]
    // event.copilotUsage → { tokenDetails, totalNanoAiu }
  });

  // session.usage_info fires with live context window state
  // Perfect data source for the ContextMeter component
  session.on("session.usage_info", (event) => {
    updateContextMeter(agentRole, {
      tokenLimit: event.tokenLimit,
      currentTokens: event.currentTokens,
      messagesLength: event.messagesLength,
      utilization: event.currentTokens / event.tokenLimit,
    });
  });

  return { getMetrics: () => metrics };
}

// ─── Pattern: End-of-session summary from shutdown event ──────────────────────

export function trackSessionShutdown(
  session: CopilotSession,
  agentRole: string,
) {
  session.on("session.shutdown", (event) => {
    console.log(`[${agentRole}] Session complete:`, {
      premiumRequests: event.totalPremiumRequests,
      apiDuration: `${event.totalApiDurationMs}ms`,
      codeChanges: event.codeChanges, // { linesAdded, linesRemoved, filesModified }
      modelMetrics: event.modelMetrics, // per-model breakdown
    });
  });
}

// Stubs for illustration
declare function recordAgentTokens(
  agent: string,
  input: number,
  output: number,
): void;
declare function updateContextMeter(
  agent: string,
  data: {
    tokenLimit: number;
    currentTokens: number;
    messagesLength: number;
    utilization: number;
  },
): void;
