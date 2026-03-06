<p align="center">
  <img src="docs/endstate-logo.svg" alt="Endstate" width="480" />
</p>

<p align="center">
  <strong>Define the outcome. Endstate handles the rest.</strong><br/>
  <em>Autonomous, multi-agent software delivery. From vision to outcome.</em>
</p>

---

Endstate is an autonomous, multi-agent software delivery system. You describe the vision. Endstate analyzes the current state of your application, orchestrates specialized agents, and iterates until the result matches the target.

You paint the vision. Endstate closes the gap.

---

## What It Does

Endstate points at a target codebase and runs a continuous pipeline of AI agents that research, explore, analyze, fix, review, and simplify, looping until the outcome reaches the desired level of quality.

**The flow:**

1. **You define the target.** A project path, an app URL, and a description of what "done" looks like.
2. **Endstate studies the current state.** The Researcher and Explorer agents examine the codebase, run the app in a browser, and identify gaps.
3. **Specialized agents close the gap.** The Analyst diagnoses patterns, the Fixer writes code and verifies builds, the UX Reviewer tests in a real browser, and the Code Simplifier reduces complexity.
4. **The pipeline loops.** Each cycle discovers, fixes, and refines. Tasks are tracked, metrics are recorded, and progress is visible in real time.

## The Agents

| Agent | Role | Focus |
|-------|------|-------|
| **Researcher** | Study the codebase structure, dependencies, and architecture | Understanding what exists |
| **Explorer** | Navigate the running app in a browser, discover issues | Finding what's broken |
| **Analyst** | Assess code quality, patterns, and severity | Diagnosing what matters |
| **Fixer** | Write fixes, run builds, verify correctness | Closing the gap |
| **UX Reviewer** | Test flows in a real browser, evaluate usability | Validating the experience |
| **Code Simplifier** | Refactor, consolidate, reduce complexity | Keeping it clean |

Agents are orchestrated in a configurable DAG. You control the order, toggle agents on or off, and set how many cycles to run.

## The Dashboard

A real-time orchestration interface built with Next.js:

- **Live agent stream** - watch each agent think, use tools, and produce output as it happens via SSE
- **Workflow graph** - visual DAG of the agent pipeline with active-node highlighting
- **Task tracking** - every issue discovered is logged with severity, status, timeline, and affected files
- **Metrics** - per-agent token usage, tool invocations, build pass/fail counts, context utilization
- **Steering** - send mid-run instructions to redirect the pipeline while agents are working
- **Git panel** - view status, diffs, and commit history for the target project
- **Themes** - Holographic (default), Pip-Boy, CRT, and Mainframe visual modes

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The setup wizard walks through:

1. **Project** - select the target codebase path
2. **Vision** - describe what you want Endstate to accomplish
3. **Model** - choose the AI model
4. **Pipeline** - configure cycles, severity threshold, and agent toggles
5. **Customize** - manage skills, MCP servers, and tool overrides
6. **Launch** - review and start

## Architecture

```
src/
  app/              Next.js App Router: pages, API routes, server actions
  components/       React UI: Dashboard, SetupWizard, AgentStream, WorkflowGraph, etc.
  hooks/            Client hooks (SSE connection)
  lib/
    copilot/        Agent session creation, system prompts, tools, skills
    pipeline/       Orchestrator, task store, project resolver, MCP manager
    otel/           OpenTelemetry instrumentation (traces, metrics)
    schemas.ts      Zod validation for pipeline config
    types.ts        Shared TypeScript types
```

Built on the [GitHub Copilot SDK](https://github.com/github/copilot-sdk) for agent sessions, with MCP server integration for filesystem, browser, and GitHub tool access.

## Why It Exists

Because builders should spend more time defining the vision and less time manually driving every step required to achieve it. Endstate closes the gap between intent and execution by handling the research, orchestration, iteration, and refinement required to turn a desired state into a delivered outcome.

*The system between idea and done.*
