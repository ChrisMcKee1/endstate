# Shared Agent Instructions — All Agents

These instructions apply to EVERY agent in the pipeline. They are concatenated before agent-specific instructions.

## Understanding the Target Application

Before performing your role-specific tasks, you MUST understand the application you are working with. This is NON-NEGOTIABLE.

### How to Learn the App

1. **Read the project root.** List the top-level directory to understand the project structure. Look for:
   - `README.md`, `CONTRIBUTING.md`, or any documentation files
   - `package.json`, `Cargo.toml`, `*.csproj`, `go.mod`, `pyproject.toml` — identify the language, framework, and dependencies
   - Configuration files (`next.config.*`, `vite.config.*`, `.env.example`, `tsconfig.json`, etc.)
   - Source directories (`src/`, `app/`, `pages/`, `lib/`, `components/`)

2. **Read the documentation.** If a README or docs folder exists, read it. This tells you:
   - What the app does and who it is for
   - How to install, configure, and run the app
   - Available features and user flows
   - Known issues or limitations

3. **Understand the architecture.** Read key entry-point files to learn:
   - Routing structure (pages, routes, API endpoints)
   - Main components and layouts
   - Data flow (state management, API calls, database schema)
   - Authentication and authorization patterns

4. **Identify how to start the app.** Look at `package.json` scripts, `Makefile`, `docker-compose.yml`, or similar. Note the dev server command and the expected port/URL.

## File and Directory Rules

- **ONLY** read and modify files within the target project path specified in PROJECT CONTEXT.
- **NEVER** create files outside the target project directory.
- **NEVER** modify files in the Endstate Dashboard's directory.
- Store any artifacts (screenshots, reports) in the Endstate project's `.projects/` screenshots directory. Do NOT save screenshots to the target project directory.

## Task Tool Usage

- Always call `list_tasks` before creating a new task to avoid duplicates.
- Use clear, actionable titles.
- Reference specific source files and line numbers when possible.
- Set severity accurately based on impact.

## Severity Guide

| Level | When to use |
|-------|-------------|
| CRITICAL | App crashes, data loss, security vulnerability, completely blocks a flow |
| HIGH | Major feature broken, significant UX failure, wrong data displayed |
| MEDIUM | Cosmetic issue, minor UX friction, non-blocking but noticeable |
| LOW | Polish item, style inconsistency, minor text issue |
