# Project Knowledge & Cheat Sheet System

The **Project Knowledge** system is the bridge between the Researcher agent's initial discovery and every downstream agent in the pipeline. It stores, persists, renders, and injects project context so agents never re-explore from scratch.

**Visual diagram:** See [Knowledge Flow](architecture/knowledge-flow.excalidraw) for an interactive view of how research data flows through the system.

## How It Works

### 1. Researcher Produces the Cheat Sheet

When the pipeline starts, the **Researcher** agent runs first (entry node in the agent graph). It deeply explores the target project — reading source code, documentation, package manifests, and build configs — then outputs a structured markdown document between delimiters:

```
---CHEAT-SHEET-START---
## Tech Stack
Next.js 16.1, React 19, Tailwind CSS 4...

## Project Structure
src/app/ — Next.js App Router pages
src/lib/ — Business logic and SDK integration
...

## How to Run
npm run dev — starts on port 9000
...
---CHEAT-SHEET-END---
```

The orchestrator detects these delimiters in the Researcher's response, extracts the content between them, and stores it via `setCheatSheet()`.

### 2. Storage & Persistence

| Layer | Location | Scope |
|-------|----------|-------|
| In-memory | `Map<projectPath, content>` in `cheat-sheet-store.ts` | Per-process lifetime |
| Disk | `.projects/<slug>/cheat-sheet.md` | Survives server restarts |

The store uses a **write-through cache** pattern: every `setCheatSheet()` updates both memory and disk. `getCheatSheet()` checks memory first, falls back to disk, and hydrates the memory cache from disk on first access.

### 3. Injection into Agent Prompts

In `src/lib/copilot/agents.ts`, the `loadSystemPrompt()` function builds each agent's system message:

```
[Base prompt] + [Agent-specific prompt] + [Project context] + [Cheat sheet]
```

For **every agent except the Researcher**, the cheat sheet is appended:

```markdown
## RESEARCHER CHEAT SHEET

The following project overview was produced by the Researcher agent.
Use this as your primary reference instead of re-exploring the project from scratch.

{cheat sheet content}
```

This means all downstream agents (Explorer, Analyst, Fixer, UX Reviewer, Consolidator, Code Simplifier) share the same project context without spending tokens re-discovering the tech stack.

### 4. API (CRUD)

The `/api/knowledge` route provides full CRUD operations:

| Method | Description | Body |
|--------|-------------|------|
| `GET /api/knowledge?projectPath=...` | Read current cheat sheet | — |
| `POST /api/knowledge` | Create or replace cheat sheet | `{ content: string, projectPath?: string }` |
| `PUT /api/knowledge` | Same as POST (alias) | `{ content: string, projectPath?: string }` |
| `DELETE /api/knowledge?projectPath=...` | Clear cheat sheet | — |

If `projectPath` is omitted, the API resolves to the active project via `getActiveProjectPath()`.

### 5. Dashboard UI — "Intel" Tab

The **ProjectKnowledge** component is the first tab in the dashboard sidebar ("Intel"). It has three states:

**Empty State** — No cheat sheet exists yet. Shows a book icon with a prompt to start the pipeline or add knowledge manually. If the pipeline is running, shows a pulsing "Researcher working..." indicator. Polls `/api/knowledge` every 8 seconds while the pipeline is active to catch new output.

**View Mode** — Renders the cheat sheet as formatted markdown using `MarkdownRenderer`. Header shows a green status dot ("Knowledge loaded"), timestamp, and Edit/Delete/Refresh buttons. Footer badge indicates the content is injected into all agent system prompts.

**Edit Mode** — Full markdown textarea editor. Supports Ctrl+S to save and Esc to cancel. Changes are immediately written to storage and reflected in subsequent agent sessions.

### 6. Manual Editing

Developers can edit the cheat sheet at any time via the Intel tab:
- Click the **pencil icon** to enter edit mode
- Modify the markdown content
- Save with the green Save button or Ctrl+S
- Changes take effect on the next agent session created

This is useful for:
- Adding project-specific knowledge the Researcher missed
- Correcting wrong assumptions about the codebase
- Adding deployment notes, credentials locations, or team conventions
- Pre-populating knowledge before the first pipeline run

### 7. Lifecycle

```
Pipeline Start
  ├── clearCheatSheet() — wipe previous run
  ├── Researcher runs (entry node)
  │   ├── Explores target project
  │   ├── Creates "Project Research Complete" task  
  │   └── Outputs ---CHEAT-SHEET-START--- ... ---CHEAT-SHEET-END---
  │       └── orchestrator detects → setCheatSheet(projectPath, content)
  │           ├── Memory: Map.set()
  │           └── Disk: .projects/<slug>/cheat-sheet.md
  │
  ├── Cycle 1+  
  │   ├── Explorer session created
  │   │   └── loadSystemPrompt() → appends cheat sheet to system message
  │   ├── Analyst session created  
  │   │   └── loadSystemPrompt() → appends cheat sheet to system message
  │   ├── Fixer session created
  │   │   └── loadSystemPrompt() → appends cheat sheet to system message
  │   └── ...
  │
  └── Developer edits via Intel tab (optional, any time)
      └── POST /api/knowledge → setCheatSheet() → next session picks it up
```

## File Reference

| File | Purpose |
|------|---------|
| `src/lib/pipeline/cheat-sheet-store.ts` | In-memory + disk store, parse delimiters |
| `src/lib/copilot/agents.ts` | System prompt construction, injects cheat sheet |
| `src/lib/copilot/agents/researcher.md` | Researcher agent prompt (defines output format) |
| `src/app/api/knowledge/route.ts` | CRUD API route |
| `src/components/ProjectKnowledge.tsx` | Dashboard Intel tab UI |
| `src/components/MarkdownRenderer.tsx` | Reusable markdown renderer |
