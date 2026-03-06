import { trace, type Span, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("agentic-app-dev");

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export function startPipelineCycleSpan(
  cycleNumber: number,
  taskCount: number
): Span {
  return tracer.startSpan("pipeline.cycle", {
    attributes: {
      "cycle.number": cycleNumber,
      "cycle.taskCount": taskCount,
    },
  });
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export function startAgentTurnSpan(
  agentName: string,
  model: string,
  promptLength: number
): Span {
  return tracer.startSpan(`agent.${agentName}.turn`, {
    attributes: {
      "agent.name": agentName,
      model,
      "prompt.length": promptLength,
    },
  });
}

export function startAgentResponseSpan(
  agentName: string,
  responseLength: number,
  totalTokens: number
): Span {
  return tracer.startSpan(`agent.${agentName}.response`, {
    attributes: {
      "agent.name": agentName,
      "response.length": responseLength,
      "tokens.total": totalTokens,
    },
  });
}

// ─── Tool ─────────────────────────────────────────────────────────────────────

export function startToolSpan(toolName: string, args: string): Span {
  return tracer.startSpan(`tool.${toolName}`, {
    attributes: {
      "tool.name": toolName,
      "tool.args": args,
    },
  });
}

// ─── MCP ──────────────────────────────────────────────────────────────────────

export function startMcpSpan(serverName: string, method: string): Span {
  return tracer.startSpan(`mcp.${serverName}.${method}`, {
    attributes: {
      "mcp.server": serverName,
      "mcp.method": method,
    },
  });
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export function startTaskCreateSpan(taskId: string, severity: string): Span {
  return tracer.startSpan("task.create", {
    attributes: {
      "task.id": taskId,
      "task.severity": severity,
    },
  });
}

export function startTaskUpdateSpan(
  taskId: string,
  status: string,
  action: string
): Span {
  return tracer.startSpan("task.update", {
    attributes: {
      "task.id": taskId,
      "task.status": status,
      "event.action": action,
    },
  });
}

// ─── Session ──────────────────────────────────────────────────────────────────

export function startCompactionSpan(
  sessionId: string,
  contextBefore: number,
  contextAfter: number
): Span {
  return tracer.startSpan("session.compaction", {
    attributes: {
      "session.id": sessionId,
      "context.before": contextBefore,
      "context.after": contextAfter,
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function endSpanOk(span: Span): void {
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
}

export function endSpanError(span: Span, error: Error): void {
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  span.recordException(error);
  span.end();
}
