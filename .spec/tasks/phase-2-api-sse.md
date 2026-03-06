# Phase 2 — API Layer + SSE

**Owner:** Backend agent
**Skills:** `copilot-sdk`, `next-best-practices`

## Pipeline API Routes

- [ ] `POST /api/pipeline/start` — Accept `PipelineConfig`, start orchestrator, return run ID
- [ ] `POST /api/pipeline/stop` — Gracefully stop the pipeline
- [ ] `POST /api/pipeline/steer` — Accept steering message, enqueue for next agent prompt
- [ ] `GET /api/pipeline/stream` — SSE endpoint: forward all session events + pipeline state

## Data API Routes

- [ ] `GET /api/models` — Return `client.listModels()` with full metadata
- [ ] `GET /api/tasks` — Return all tasks (with optional status/severity filters)
- [ ] `GET /api/tasks/[id]` — Return single task with full timeline
- [ ] `GET /api/settings` — Return current `PipelineConfig`
- [ ] `POST /api/settings` — Update and persist `PipelineConfig`

## Task Persistence

- [ ] Ensure `data/tasks/` directory created on first write
- [ ] Atomic JSON writes (write to temp then rename)
- [ ] Load all task files on server startup
- [ ] Task ID generation: `TSK-{padded-number}`

## SSE Streaming

- [ ] `ReadableStream` in route handler for `/api/pipeline/stream`
- [ ] Forward all 40+ session event types with structured JSON
- [ ] Include event type, timestamp, agent name, and payload
- [ ] Heartbeat keep-alive every 15 seconds
- [ ] Clean disconnect on pipeline stop

## Steering Injection

- [ ] `onUserPromptSubmitted` hook dequeues steering messages
- [ ] Format: `[DEVELOPER STEERING]: {message}`
- [ ] Queue persists across agent turns within a cycle
- [ ] Return steering acknowledgement SSE event

## Verification

- [ ] All API routes return proper status codes and `NextResponse.json()`
- [ ] SSE stream delivers events to curl client
- [ ] Steering message flows from POST → hook → agent prompt
- [ ] `npm run typecheck` passes
