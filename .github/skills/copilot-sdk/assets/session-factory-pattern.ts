// @ts-nocheck
// Asset: Session Factory Pattern
// Shows how Endstate creates isolated Copilot SDK sessions per agent role.
// See: src/lib/copilot/agents.ts

import { getClient } from "@/lib/copilot/client";
import { approveAll } from "@github/copilot-sdk";
import type { SessionConfig } from "@github/copilot-sdk";

// ─── Pattern: Create an agent session with full configuration ─────────────────

export async function createAgentSession(
  role: string,
  config: {
    model: string;
    projectPath: string;
    infiniteSessions: boolean;
    reasoningEffort?: string;
  },
) {
  const client = await getClient();

  // 1. Build system prompt from layered markdown files
  const systemPrompt = buildSystemPrompt(role, config);

  // 2. Resolve MCP servers per role
  const mcpServers = getMcpServersForRole(role, config.projectPath);

  // 3. Build session config
  const sessionConfig: Parameters<typeof client.createSession>[0] = {
    model: config.model,
    streaming: true,

    // Use "replace" mode to fully control the system prompt
    systemMessage: { mode: "replace", content: systemPrompt },

    // Custom tools registered via defineTool()
    tools: agentTools,

    // MCP servers vary by agent role
    mcpServers,

    // Working directory scoped to target project
    workingDirectory: config.projectPath,

    // Session state directory — prevents cross-pollution
    configDir: `${config.projectPath}/.agentic`,

    // Infinite sessions: SDK handles compaction transparently
    infiniteSessions: {
      enabled: config.infiniteSessions,
      backgroundCompactionThreshold: 0.75,  // Start background compaction at 75%
      bufferExhaustionThreshold: 0.9,       // Urgent compaction at 90%
    },

    // Auto-approve all permission requests (tool execution, file writes, etc.)
    onPermissionRequest: approveAll,

    // Hooks for OTel instrumentation + steering injection
    hooks: buildHooks(),

    // Optional: reasoning effort for supported models
    ...(config.reasoningEffort && { reasoningEffort: config.reasoningEffort }),
  };

  return client.createSession(sessionConfig);
}

// ─── Pattern: System prompt composition from layered markdown ─────────────────

function buildSystemPrompt(role: string, config: { projectPath: string }): string {
  // Layer 1: Shared base instructions (prompts/_base.md)
  const basePrompt = loadMarkdownFile("prompts/_base.md");

  // Layer 2: Role-specific instructions (agents/<role>.md)
  const agentPrompt = loadMarkdownFile(`agents/${role}.md`);

  // Layer 3: Dynamic project context
  const projectContext = `
## PROJECT CONTEXT
**Target project path:** ${config.projectPath}
**Target app URL:** ${config.appUrl}
**Inspiration:** "${config.inspiration}"
`;

  // Layer 4: Cheat sheet (all agents except researcher)
  const cheatSheet = role !== "researcher" ? getCheatSheet(config.projectPath) : "";

  return [basePrompt, agentPrompt, projectContext, cheatSheet]
    .filter(Boolean)
    .join("\n\n---\n\n");
}

// ─── Pattern: MCP server assignment per agent role ────────────────────────────

function getMcpServersForRole(role: string, projectPath: string) {
  const filesystem = {
    type: "local" as const,
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", projectPath],
    tools: ["*"],
  };

  const playwright = {
    type: "local" as const,
    command: "npx",
    args: ["@playwright/mcp@latest"],
    tools: ["*"],
  };

  const github = {
    type: "local" as const,
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    tools: ["*"],
  };

  // Browser-facing agents get Playwright + filesystem
  if (["explorer", "ux-reviewer"].includes(role)) {
    return { fs: filesystem, playwright };
  }

  // Code-fixing agents get filesystem + GitHub
  if (["fixer", "code-simplifier", "consolidator"].includes(role)) {
    return { fs: filesystem, github };
  }

  // Analysis agents get filesystem only
  return { fs: filesystem };
}

// Stubs for illustration
declare function loadMarkdownFile(path: string): string;
declare function getCheatSheet(projectPath: string): string;
declare const agentTools: unknown[];
declare function buildHooks(): NonNullable<SessionConfig["hooks"]>;
