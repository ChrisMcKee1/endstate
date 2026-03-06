import { v4 as uuid } from "uuid";
import type { SteeringMessage } from "@/lib/types";

const queue: SteeringMessage[] = [];

export function enqueue(message: string): SteeringMessage {
  const entry: SteeringMessage = {
    id: uuid(),
    message,
    timestamp: new Date().toISOString(),
  };
  queue.push(entry);
  return entry;
}

export function dequeue(): SteeringMessage | undefined {
  return queue.shift();
}

export function isEmpty(): boolean {
  return queue.length === 0;
}
