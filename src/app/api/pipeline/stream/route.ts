import { onSSE, getPipelineState } from "@/lib/pipeline/orchestrator";
import type { SSEEvent } from "@/lib/types";
import { SESSION_EVENT_TYPES } from "@/lib/types";
import { recordSSEConnect, recordSSEDisconnect } from "@/lib/otel/metrics";

const HEARTBEAT_INTERVAL = 15_000;

export async function GET() {
  const encoder = new TextEncoder();
  let cleanupFn: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      recordSSEConnect();

      // Send initial state
      const initial: SSEEvent = {
        type: SESSION_EVENT_TYPES.PIPELINE_STATE_CHANGE,
        timestamp: new Date().toISOString(),
        data: { state: getPipelineState() },
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initial)}\n\n`)
      );

      // Subscribe to SSE events
      const unsubscribe = onSSE((event: SSEEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      });

      // Heartbeat
      const heartbeat = setInterval(() => {
        try {
          const hb: SSEEvent = {
            type: SESSION_EVENT_TYPES.HEARTBEAT,
            timestamp: new Date().toISOString(),
            data: {},
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(hb)}\n\n`)
          );
        } catch {
          clearInterval(heartbeat);
        }
      }, HEARTBEAT_INTERVAL);

      cleanupFn = () => {
        recordSSEDisconnect();
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
    cancel() {
      cleanupFn?.();
      cleanupFn = null;
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
