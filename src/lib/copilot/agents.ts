import fs from "node:fs";
import path from "node:path";
import { getClient } from "@/lib/copilot/client";
import { agentTools } from "@/lib/copilot/tools";
import { dequeue, isEmpty } from "@/lib/pipeline/steering";
import { startToolSpan, endSpanOk } from "@/lib/otel/spans";
import { recordToolInvocation } from "@/lib/otel/metrics";
import type { AgentRole, PipelineConfig } from "@/lib/types";
import { AGENT_ROLES } from "@/lib/types";
import { approveAll } from "@github/copilot-sdk";
import type { SessionConfig } from "@github/copilot-sdk";

// ─── System prompt loader ─────────────────────────────────────────────────────

const INSTRUCTIONS_DIR = path.join(
  process.cwd(),
  "src",
  "lib",
  "copilot",
  "instructions"
);

function loadSystemPrompt(role: AgentRole, config: PipelineConfig): string {
  const filePath = path.join(INSTRUCTIONS_DIR, `${role}.md`);
  const base = fs.readFileSync(filePath, "utf-8");

  const context = [
    "",
    "## PROJECT CONTEXT",
    `Path: ${config.projectPath}`,
    `App URL: ${config.appUrl}`,
    `Inspiration: "${config.inspiration}"`,
    `Current model: ${config.model}`,
  ].join("\n");

  return base + context;
}

// ─── MCP server configs per role ──────────────────────────────────────────────

const MCP_PLAYWRIGHT = {
  type: "stdio" as const,
  command: "npx",
  args: ["-y", "@anthropic/mcp-playwright"],
  tools: ["*"],
};

function mcpFilesystem(projectPath: string) {
  return {
    type: "stdio" as const,
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", projectPath],
    tools: ["*"],
  };
}

const MCP_GITHUB = {
  type: "stdio" as const,
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  tools: ["*"],
};

function mcpServersForRole(
  role: AgentRole,
  projectPath: string
): Record<string, { type: "stdio"; command: string; args: string[]; tools: string[] }> {
  switch (role) {
    case AGENT_ROLES.EXPLORER:
      return { playwright: MCP_PLAYWRIGHT };
    case AGENT_ROLES.ANALYST:
      return { fs: mcpFilesystem(projectPath) };
    case AGENT_ROLES.FIXER:
      return {
        fs: mcpFilesystem(projectPath),
        github: MCP_GITHUB,
      };
    case AGENT_ROLES.UX_REVIEWER:
      return { playwright: MCP_PLAYWRIGHT };
  }
}

// ─── Session hooks ────────────────────────────────────────────────────────────

// Track OTel spans across pre/post hooks without mutating hook inputs
const spanMap = new WeakMap<object, ReturnType<typeof startToolSpan>>();

function buildHooks(): SessionConfig["hooks"] {
  return {
    onPreToolUse: async (input) => {
      const span = startToolSpan(input.toolName, "");
      recordToolInvocation(input.toolName);
      spanMap.set(input, span);
      return { permissionDecision: "allow" as const };
    },
    onPostToolUse: async (input) => {
      const span = spanMap.get(input);
      if (span) {
        endSpanOk(span);
        spanMap.delete(input);
      }
    },
    onUserPromptSubmitted: async (input) => {
      if (isEmpty()) return { modifiedPrompt: input.prompt };
      const steering = dequeue();
      if (!steering) return { modifiedPrompt: input.prompt };
      return {
        modifiedPrompt: `${input.prompt}\n\n[DEVELOPER STEERING]: ${steering.message}`,
      };
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function createAgentSession(
  role: AgentRole,
  config: PipelineConfig
) {
  const client = await getClient();
  const systemPrompt = loadSystemPrompt(role, config);

  const session = await client.createSession({
    model: config.model,
    streaming: true,
    systemMessage: { content: systemPrompt },
    tools: agentTools,
    mcpServers: mcpServersForRole(role, config.projectPath),
    infiniteSessions: {
      enabled: config.infiniteSessions,
      backgroundCompactionThreshold: 0.75,
      bufferExhaustionThreshold: 0.9,
    },
    onPermissionRequest: config.autoApprove ? approveAll : approveAll,
    hooks: buildHooks(),
  });

  return session;
}
