"use client";

import { useState, useEffect } from "react";
import type { SSEEvent, SessionEventType } from "@/lib/types";

const MAX_EVENTS = 500;
const MAX_RETRIES = 10;
const MAX_BACKOFF_MS = 30_000;

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseSSEReturn {
  events: SSEEvent[];
  connectionStatus: ConnectionStatus;
  latestByType: Map<SessionEventType, SSEEvent>;
}

export function useSSE(url: string): UseSSEReturn {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [latestByType, setLatestByType] = useState<
    Map<SessionEventType, SSEEvent>
  >(() => new Map());

  useEffect(() => {
    let retryCount = 0;
    let es: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const latest = new Map<SessionEventType, SSEEvent>();

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
          latest.set(event.type, event);
          setLatestByType(new Map(latest));
          setEvents((prev) => {
            const next = [...prev, event];
            return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next;
          });
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
    };
  }, [url]);

  return { events, connectionStatus, latestByType };
}
