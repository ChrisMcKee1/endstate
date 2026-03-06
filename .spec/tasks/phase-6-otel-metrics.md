# Phase 6 — OpenTelemetry + Metrics

**Owner:** Backend agent
**Skills:** `copilot-sdk`, `next-best-practices`

## OTel SDK Setup (`src/lib/otel/setup.ts`)

- [ ] Initialize `NodeSDK` with OTLP exporters (traces + metrics)
- [ ] Resource with `service.name: "agentic-app-dev"`, `service.version`
- [ ] Configurable OTLP endpoint via env var (`OTEL_EXPORTER_OTLP_ENDPOINT`)
- [ ] `PeriodicExportingMetricReader` with 10s export interval
- [ ] Graceful shutdown on process exit

## Span Helpers (`src/lib/otel/spans.ts`)

- [ ] `startPipelineCycleSpan(cycleNumber, taskCount)` — root span per cycle
- [ ] `startAgentTurnSpan(agentName, model, promptLength)` — child of cycle
- [ ] `startAgentResponseSpan(agentName, responseLength, totalTokens)` — child of turn
- [ ] `startToolSpan(toolName, args)` — child of turn
- [ ] `startMcpSpan(serverName, method)` — child of turn
- [ ] `startTaskCreateSpan(taskId, severity)` — child of turn
- [ ] `startTaskUpdateSpan(taskId, status, action)` — child of turn
- [ ] `startCompactionSpan(sessionId, contextBefore, contextAfter)` — child of turn
- [ ] All spans include relevant attributes per the spec table

## Metrics (`src/lib/otel/metrics.ts`)

- [ ] Counter: `pipeline.cycles.total`
- [ ] Counter: `pipeline.tasks.created`
- [ ] Counter: `pipeline.tasks.resolved`
- [ ] Counter: `agent.turns.total` (per agent label)
- [ ] Counter: `agent.tokens.input` (per agent label)
- [ ] Counter: `agent.tokens.output` (per agent label)
- [ ] Histogram: `agent.latency.seconds` (per agent)
- [ ] Counter: `tool.invocations.total` (per tool name)
- [ ] Gauge: `session.context.usage` (0.0–1.0)
- [ ] Counter: `session.compactions.total`
- [ ] Counter: `fixer.builds.pass`
- [ ] Counter: `fixer.builds.fail`
- [ ] Gauge: `ux.score.{category}`

## Instrumentation Integration

- [ ] Hook spans into `onPreToolUse` / `onPostToolUse` session hooks
- [ ] Record metrics in orchestrator on task create/update
- [ ] Record metrics in agent session factory on turn start/end
- [ ] Record context usage from compaction events

## Context Meter Data

- [ ] Expose `session.context.usage` via SSE events
- [ ] Calculate from compaction event `context.before` / `context.after`
- [ ] Forward to frontend for `ContextMeter` component

## Metrics API

- [ ] `GET /api/metrics` — Return current metric snapshots for MetricsBar
- [ ] Aggregate counters per agent, per tool
- [ ] Include latency percentiles

## Optional: Collector Config

- [ ] `otel-collector-config.yaml` for local Jaeger + Grafana setup
- [ ] Docker compose snippet in docs for running collector

## Verification

- [ ] Spans appear in OTel collector (or console exporter)
- [ ] Metrics increment correctly on task create/resolve
- [ ] Context meter updates on compaction events
- [ ] `/api/metrics` returns structured data
- [ ] `npm run typecheck` passes
