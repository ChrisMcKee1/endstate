// @ts-nocheck
// Asset: Session Hook Patterns
// Shows how to use SDK hooks for instrumentation, steering, and error handling.
// Reference: references/session-config.md → SessionHooks

import type { SessionConfig } from "@github/copilot-sdk";

// ─── Pattern 1: OTel instrumentation via pre/post tool hooks ──────────────────

function buildOtelHooks(): NonNullable<SessionConfig["hooks"]> {
  // WeakMap tracks spans across pre→post without mutating hook inputs
  const spanMap = new WeakMap<object, { end: () => void }>();

  return {
    onPreToolUse: async (input, _ctx) => {
      const span = startToolSpan(input.toolName, JSON.stringify(input.arguments));
      recordToolInvocation(input.toolName);
      spanMap.set(input, span);
      return { permissionDecision: "allow" as const };
    },
    onPostToolUse: async (input, _ctx) => {
      const span = spanMap.get(input);
      if (span) {
        span.end();
        spanMap.delete(input);
      }
    },
  };
}

// ─── Pattern 2: Steering injection via onUserPromptSubmitted ──────────────────

function buildSteeringHooks(): NonNullable<SessionConfig["hooks"]> {
  return {
    onUserPromptSubmitted: async (input, _ctx) => {
      // Check if developer has queued a steering message
      const steering = steeringQueue.dequeue();
      if (!steering) return { modifiedPrompt: input.prompt };

      // Append steering directive — agent sees it as part of the prompt
      return {
        modifiedPrompt: `${input.prompt}\n\n[DEVELOPER STEERING]: ${steering.message}`,
      };
    },
  };
}

// ─── Pattern 3: Error handling with retry logic ───────────────────────────────

function buildErrorHooks(): NonNullable<SessionConfig["hooks"]> {
  return {
    onErrorOccurred: async (error, _ctx) => {
      // Retry transient errors (rate limits, network)
      if (error.type === "rate_limit" || error.type === "network") {
        return { errorHandling: "retry" as const, retryCount: 3 };
      }
      // Skip non-critical tool failures
      if (error.type === "tool_error") {
        return { errorHandling: "skip" as const };
      }
      // Abort on auth or critical errors
      return { errorHandling: "abort" as const, userNotification: error.message };
    },
  };
}

// ─── Pattern 4: Session lifecycle hooks ───────────────────────────────────────

function buildLifecycleHooks(): NonNullable<SessionConfig["hooks"]> {
  return {
    onSessionStart: async (ctx) => {
      console.log(`Session starting (source: ${ctx.source})`);
      // Can modify config dynamically based on state
      return { additionalContext: "Session initialized by Endstate pipeline" };
    },
    onSessionEnd: async (ctx) => {
      console.log(`Session ending (reason: ${ctx.reason})`);
      return { sessionSummary: "Agent session completed" };
    },
  };
}

// ─── Pattern 5: Combined hooks (what Endstate actually uses) ──────────────────

export function buildHooks(): NonNullable<SessionConfig["hooks"]> {
  const spanMap = new WeakMap<object, { end: () => void }>();

  return {
    onPreToolUse: async (input, _ctx) => {
      const span = startToolSpan(input.toolName, "");
      recordToolInvocation(input.toolName);
      spanMap.set(input, span);
      return { permissionDecision: "allow" as const };
    },
    onPostToolUse: async (input, _ctx) => {
      const span = spanMap.get(input);
      if (span) {
        span.end();
        spanMap.delete(input);
      }
    },
    onUserPromptSubmitted: async (input, _ctx) => {
      const steering = steeringQueue.dequeue();
      if (!steering) return { modifiedPrompt: input.prompt };
      return {
        modifiedPrompt: `${input.prompt}\n\n[DEVELOPER STEERING]: ${steering.message}`,
      };
    },
  };
}

// Stubs for illustration
declare function startToolSpan(name: string, args: string): { end: () => void };
declare function recordToolInvocation(name: string): void;
declare const steeringQueue: { dequeue: () => { message: string } | null };
