"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { SSEEvent, SessionEventType } from "@/lib/types";

const MAX_RETRIES = 10;
const MAX_BACKOFF_MS = 30_000;
const FLUSH_INTERVAL_MS = 16; // ~60fps

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseSSEReturn {
  events: SSEEvent[];
  connectionStatus: ConnectionStatus;
  latestByType: Map<SessionEventType, SSEEvent>;
  /** Call to acknowledge processed events so the buffer can be freed */
  acknowledge: (count: number) => void;
}

export function useSSE(url: string): UseSSEReturn {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  // Use refs for event buffering to avoid render-loop issues.
  // `pendingRef` accumulates incoming SSE events between flushes.
  // `deliveredRef` holds the events currently exposed to the consumer.
  // `acknowledgedRef` tracks how many the consumer has processed.
  const pendingRef = useRef<SSEEvent[]>([]);
  const deliveredRef = useRef<SSEEvent[]>([]);
  const acknowledgedRef = useRef(0);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<Map<SessionEventType, SSEEvent>>(new Map());

  // State that triggers re-renders — only updated on flush, not per-event
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [latestByType, setLatestByType] = useState<Map<SessionEventType, SSEEvent>>(() => new Map());

  const flush = useCallback(() => {
    flushTimer.current = null;

    // Remove events the consumer already acknowledged
    if (acknowledgedRef.current > 0) {
      deliveredRef.current = deliveredRef.current.slice(acknowledgedRef.current);
      acknowledgedRef.current = 0;
    }

    // Append new pending events
    if (pendingRef.current.length > 0) {
      deliveredRef.current = [...deliveredRef.current, ...pendingRef.current];
      pendingRef.current = [];
    }

    // Cap the buffer to prevent unbounded growth if consumer falls behind
    if (deliveredRef.current.length > 5000) {
      deliveredRef.current = deliveredRef.current.slice(-3000);
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

  useEffect(() => {
    let retryCount = 0;
    let es: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      es?.close();
      es = new EventSource(url);

      es.onopen = () => {
        setConnectionStatus("connected");
        retryCount = 0;
      };

      es.onmessage = (e: MessageEvent<string>) => {
        try {
          const event = JSON.parse(e.data) as SSEEvent;
          latestRef.current.set(event.type, event);
          pendingRef.current.push(event);
          scheduleFlush();
        } catch {
          /* skip malformed frames */
        }
      };

      es.onerror = () => {
        es?.close();
        setConnectionStatus("disconnected");

        if (retryCount < MAX_RETRIES) {
          const delay = Math.min(
            1000 * Math.pow(2, retryCount),
            MAX_BACKOFF_MS,
          );
          retryCount++;
          timer = setTimeout(connect, delay);
        } else {
          setConnectionStatus("error");
        }
      };
    };

    connect();

    return () => {
      es?.close();
      if (timer) clearTimeout(timer);
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, [url, scheduleFlush]);

  return { events, connectionStatus, latestByType, acknowledge };
}
