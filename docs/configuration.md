# Configuration Reference

This document covers all configuration surfaces in Endstate — how to set them up, where they persist, and what each option controls.

## Pipeline Configuration

The pipeline is configured via the Setup Wizard or Settings Panel. Configuration persists to two locations:

1. **`.projects/<slug>/config.json`** — Endstate's own storage
2. **`.agentic-dev.json`** — Written to the target project root (can be version-controlled)

### Core Settings

| Field | Type | Description |
|-------|------|-------------|
| `projectPath` | `string` | Absolute path to the target project directory |
| `inspiration` | `string` | Developer's vision — what should the app be? |
| `model` | `string` | LLM model ID (e.g., `claude-opus-4.6`, `gpt-4.1`) |
| `maxCycles` | `number` | Maximum pipeline iterations before auto-stop |
| `fixSeverity` | `Severity` | Minimum severity the Fixer will attempt to fix |
| `infiniteSessions` | `boolean` | Enable SDK context compaction for long sessions |
| `reasoningEffort` | `string` | `"low"` \| `"medium"` \| `"high"` \| `"xhigh"` |

### Agent Toggles

| Field | Default | Description |
|-------|---------|-------------|
| `enableResearcher` | `true` | Run the Researcher agent (entry node) |
| `enableExplorer` | `true` | Run the Explorer agent |
| `enableAnalyst` | `true` | Run the Analyst agent |
| `enableFixer` | `true` | Run the Fixer agent |
| `enableUxReviewer` | `true` | Run the UX Reviewer agent |
| `enableConsolidator` | `true` | Run the Consolidator (merge gate) |
| `enableCodeSimplifier` | `true` | Run the Code Simplifier |

### Domain Toggles

| Field | Default | Description |
|-------|---------|-------------|
| `enableDomainUI` | `true` | Enable UI domain analysts/fixers |
| `enableDomainBackend` | `true` | Enable backend domain analysts/fixers |
| `enableDomainDatabase` | `true` | Enable database domain analysts/fixers |
| `enableDomainDocs` | `true` | Enable docs domain analysts/fixers |

### Advanced

| Field | Default | Description |
|-------|---------|-------------|
| `enableWorktreeIsolation` | `false` | Give each fixer its own git worktree |
| `agentGraph` | `DEFAULT_AGENT_GRAPH` | Custom DAG overriding the default pipeline |
| `skills` | `[]` | Skill directories to load per agent |
| `customAgentDefinitions` | `[]` | Custom agent personas |
| `mcpServerOverrides` | `[]` | Override default MCP server configs |
| `toolOverrides` | `[]` | Disable specific tools |

## Project Resolution

Projects are identified by slugifying the `projectPath` basename:

```
/home/user/projects/my-awesome-app  →  slug: "my-awesome-app"
```

The active project is tracked in `.projects/active.json`:

```json
{
  "projectPath": "/home/user/projects/my-awesome-app",
  "slug": "my-awesome-app"
}
```

## Agent System Prompts

Each agent's system prompt is constructed from layers:

```
src/lib/copilot/prompts/_base.md        — Shared base instructions
src/lib/copilot/agents/<role>.md        — Role-specific instructions
[PROJECT CONTEXT block]                  — Generated from PipelineConfig
[RESEARCHER CHEAT SHEET block]          — From cheat-sheet-store (all except Researcher)
```

## MCP Server Defaults

| Agent | MCP Servers |
|-------|-------------|
| Researcher | filesystem |
| Explorer | filesystem |
| Analyst (all) | filesystem |
| Fixer (all) | filesystem, github |
| Consolidator | filesystem, github |
| Code Simplifier | filesystem, github |
| UX Reviewer | filesystem |

All agents also receive the `playwright-cli` skill directory, giving them browser automation via `playwright-cli` commands.

These can be overridden per-agent via `mcpServerOverrides` in the config.

## Environment Variables

Endstate itself requires no environment variables. The target project may need its own `.env` setup — the Researcher agent will document this in the cheat sheet.

OTel traces export to `OTEL_EXPORTER_OTLP_ENDPOINT` (defaults to `http://localhost:4318`).
