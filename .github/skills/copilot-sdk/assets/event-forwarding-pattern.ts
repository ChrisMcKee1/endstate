// @ts-nocheck
// Asset: SSE Event Forwarding Pattern
// Shows how SDK session events are forwarded to the dashboard via Server-Sent Events.
// Reference: src/app/api/pipeline/stream/route.ts

import type { CopilotSession } from "@github/copilot-sdk";

// ─── Pattern: Subscribe to all session events and forward via SSE ─────────────

function forwardSessionEvents(
  session: CopilotSession,
  controller: ReadableStreamDefaultController,
) {
  const encoder = new TextEncoder();

  const unsubscribe = session.on((event) => {
    const ssePayload = {
      type: event.type,
      timestamp: new Date().toISOString(),
      data: event,
    };
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(ssePayload)}\n\n`));
    } catch {
      // Stream closed by client — ignore
    }
  });

  return unsubscribe;
}

// ─── Pattern: Key events to forward selectively ──────────────────────────────

function forwardKeyEvents(session: CopilotSession, emit: (event: unknown) => void) {
  // Streaming text chunks
  session.on("assistant.message_delta", (e) => {
    emit({ type: "assistant.message_delta", content: e.content });
  });

  // Complete message
  session.on("assistant.message", (e) => {
    emit({ type: "assistant.message", content: e.content });
  });

  // Extended thinking
  session.on("assistant.reasoning_delta", (e) => {
    emit({ type: "assistant.reasoning_delta", content: e.content });
  });

  // Tool activity
  session.on("tool.execution_start", (e) => {
    emit({
      type: "tool.execution_start",
      toolName: e.toolName,
      toolCallId: e.toolCallId,
      mcpServer: e.mcpServerName,
    });
  });

  session.on("tool.execution_complete", (e) => {
    emit({
      type: "tool.execution_complete",
      toolName: e.toolName,
      success: e.success,
    });
  });

  // Context management
  session.on("session.compaction_start", () => {
    emit({ type: "session.compaction_start" });
  });

  session.on("session.compaction_complete", (e) => {
    emit({
      type: "session.compaction_complete",
      tokensFreed: e.tokensFreed,
    });
  });

  // Per-call token usage (feed to MetricsBar)
  session.on("assistant.usage", (e) => {
    emit({
      type: "assistant.usage",
      model: e.model,
      inputTokens: e.inputTokens,
      outputTokens: e.outputTokens,
    });
  });

  // Context window state (feed to ContextMeter)
  session.on("session.usage_info", (e) => {
    emit({
      type: "session.usage_info",
      tokenLimit: e.tokenLimit,
      currentTokens: e.currentTokens,
    });
  });

  // Errors
  session.on("session.error", (e) => {
    emit({ type: "session.error", message: e.message, errorType: e.errorType });
  });

  // Session idle = turn complete
  session.on("session.idle", () => {
    emit({ type: "session.idle" });
  });
}

// ─── Pattern: Next.js SSE route handler ──────────────────────────────────────

export async function GET() {
  const encoder = new TextEncoder();
  let cleanupFn: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connected event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`),
      );

      // Subscribe to pipeline event bus
      const unsubscribe = onSSE((event: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        } catch {
          /* stream closed */
        }
      });

      // Heartbeat keeps connection alive through proxies
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "heartbeat" })}\n\n`,
            ),
          );
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      cleanupFn = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
    cancel() {
      cleanupFn?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// Stubs for illustration
declare function onSSE(handler: (event: unknown) => void): () => void;
