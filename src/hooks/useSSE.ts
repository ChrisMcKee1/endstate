"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { SSEEvent, SessionEventType } from "@/lib/types";

const MAX_BACKOFF_MS = 30_000;
const FLUSH_INTERVAL_MS = 16; // ~60fps
const HEARTBEAT_TIMEOUT_MS = 45_000; // Reconnect if no data in 45s
const BUFFER_HIGH_WATER = 5000;
const BUFFER_LOW_WATER = 3000;

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseSSEReturn {
  events: SSEEvent[];
  connectionStatus: ConnectionStatus;
  latestByType: Map<SessionEventType, SSEEvent>;
  /** Call to acknowledge processed events so the buffer can be freed */
  acknowledge: (count: number) => void;
  /** Monotonic counter incremented each time the events array is replaced after flush.
   *  Consumers can compare against their own snapshot to detect when the array shifted. */
  generation: number;
  /** Force a reconnection (e.g. from a "Reconnect" button) */
  reconnect: () => void;
}

export function useSSE(url: string): UseSSEReturn {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  // Monotonic generation counter — bumped each time events array is replaced.
  // Lets consumers know when the array shifted so they can reset cursors.
  const generationRef = useRef(0);
  const [generation, setGeneration] = useState(0);

  // Use refs for event buffering to avoid render-loop issues.
  const pendingRef = useRef<SSEEvent[]>([]);
  const deliveredRef = useRef<SSEEvent[]>([]);
  const acknowledgedRef = useRef(0);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<Map<SessionEventType, SSEEvent>>(new Map());

  // State that triggers re-renders — only updated on flush, not per-event
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [latestByType, setLatestByType] = useState<Map<SessionEventType, SSEEvent>>(() => new Map());

  // Manual reconnect signal: incrementing this triggers a new connection
  const [reconnectSignal, setReconnectSignal] = useState(0);

  const flush = useCallback(() => {
    flushTimer.current = null;

    const hadAcknowledged = acknowledgedRef.current > 0;

    // Remove events the consumer already acknowledged
    if (hadAcknowledged) {
      deliveredRef.current = deliveredRef.current.slice(acknowledgedRef.current);
      acknowledgedRef.current = 0;
    }

    // Append new pending events
    const hadPending = pendingRef.current.length > 0;
    if (hadPending) {
      deliveredRef.current = [...deliveredRef.current, ...pendingRef.current];
      pendingRef.current = [];
    }

    // Cap the buffer to prevent unbounded growth if consumer falls behind
    if (deliveredRef.current.length > BUFFER_HIGH_WATER) {
      deliveredRef.current = deliveredRef.current.slice(-BUFFER_LOW_WATER);
    }

    // Bump generation when the array shifted (acknowledge removed items or buffer was capped)
    if (hadAcknowledged || hadPending) {
      generationRef.current++;
      setGeneration(generationRef.current);
    }

    setEvents(deliveredRef.current);
    setLatestByType(new Map(latestRef.current));
  }, []);

  const scheduleFlush = useCallback(() => {
    if (!flushTimer.current) {
      flushTimer.current = setTimeout(flush, FLUSH_INTERVAL_MS);
    }
  }, [flush]);

  const acknowledge = useCallback((count: number) => {
    acknowledgedRef.current += count;
    scheduleFlush();
  }, [scheduleFlush]);

  const reconnect = useCallback(() => {
    setReconnectSignal((s: number) => s + 1);
  }, []);

  useEffect(() => {
    let retryCount = 0;
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const resetHeartbeatTimer = () => {
      if (heartbeatTimer) clearTimeout(heartbeatTimer);
      if (disposed) return;
      heartbeatTimer = setTimeout(() => {
        // No data received within HEARTBEAT_TIMEOUT_MS — connection is stale
        if (!disposed) {
          es?.close();
          setConnectionStatus("disconnected");
          scheduleRetry();
        }
      }, HEARTBEAT_TIMEOUT_MS);
    };

    const scheduleRetry = () => {
      if (disposed) return;
      // Always retry — never give up. Use capped exponential backoff.
      const delay = Math.min(1000 * Math.pow(2, Math.min(retryCount, 10)), MAX_BACKOFF_MS);
      retryCount++;
      retryTimer = setTimeout(connect, delay);
    };

    const connect = () => {
      if (disposed) return;
      es?.close();
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
      setConnectionStatus("connecting");

      es = new EventSource(url);

      es.onopen = () => {
        if (disposed) return;
        setConnectionStatus("connected");
        retryCount = 0;
        resetHeartbeatTimer();
      };

      es.onmessage = (e: MessageEvent<string>) => {
        if (disposed) return;
        // Any incoming data resets heartbeat timer (including heartbeats themselves)
        resetHeartbeatTimer();
        try {
          const event = JSON.parse(e.data) as SSEEvent;
          latestRef.current.set(event.type, event);
          pendingRef.current.push(event);
          scheduleFlush();
        } catch {
          // Skip malformed frames
        }
      };

      es.onerror = () => {
        if (disposed) return;
        es?.close();
        setConnectionStatus("disconnected");
        if (heartbeatTimer) clearTimeout(heartbeatTimer);
        scheduleRetry();
      };
    };

    connect();

    // Handle page visibility — reconnect when tab becomes visible after being hidden
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !disposed) {
        // Force reconnect when tab becomes visible to recover from
        // background throttling or stale connections
        if (heartbeatTimer) clearTimeout(heartbeatTimer);
        if (retryTimer) clearTimeout(retryTimer);
        retryCount = 0;
        es?.close();
        connect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposed = true;
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
      if (heartbeatTimer) clearTimeout(heartbeatTimer);
      if (flushTimer.current) clearTimeout(flushTimer.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [url, scheduleFlush, reconnectSignal]);

  return { events, connectionStatus, latestByType, acknowledge, generation, reconnect };
}
