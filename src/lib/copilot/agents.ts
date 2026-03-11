import fs from "node:fs";
import path from "node:path";
import { getClient } from "@/lib/copilot/client";
import { agentTools } from "@/lib/copilot/tools";
import { dequeue, isEmpty } from "@/lib/pipeline/steering";
import { getSkillDirectoriesForAgent } from "@/lib/pipeline/skill-manager";
import { getMcpServersForAgent } from "@/lib/pipeline/mcp-manager";
import { getCheatSheet } from "@/lib/pipeline/cheat-sheet-store";
import { projectScreenshotsDir } from "@/lib/pipeline/project-resolver";
import { startToolSpan, endSpanOk } from "@/lib/otel/spans";
import { recordToolInvocation } from "@/lib/otel/metrics";
import type { AgentRole, PipelineConfig } from "@/lib/types";
import { AGENT_ROLES, isAnalystRole, isFixerRole } from "@/lib/types";
import { approveAll } from "@github/copilot-sdk";
import type { SessionConfig } from "@github/copilot-sdk";

// ─── System prompt loader ─────────────────────────────────────────────────────

const PROMPTS_DIR = path.join(process.cwd(), "src", "lib", "copilot", "prompts");
const AGENTS_DIR = path.join(process.cwd(), "src", "lib", "copilot", "agents");
// Keep legacy path for backward compatibility during migration
const LEGACY_INSTRUCTIONS_DIR = path.join(
  process.cwd(),
  "src",
  "lib",
  "copilot",
  "instructions"
);

function loadPromptFile(dir: string, filename: string): string {
  const fp = path.join(dir, filename);
  if (fs.existsSync(fp)) return fs.readFileSync(fp, "utf-8");
  return "";
}

function loadSystemPrompt(role: AgentRole, config: PipelineConfig): string {
  // Load shared base from prompts/
  const basePrompt = loadPromptFile(PROMPTS_DIR, "_base.md");

  // Load agent-specific prompt from agents/, fall back to legacy instructions/
  let agentPrompt = loadPromptFile(AGENTS_DIR, `${role}.md`);
  if (!agentPrompt) {
    agentPrompt = loadPromptFile(LEGACY_INSTRUCTIONS_DIR, `${role}.md`);
  }

  const context = [
    "",
    "## PROJECT CONTEXT",
    "",
    `**Target project path:** ${config.projectPath}`,
    `**Target app URL:** ${config.appUrl}`,
    `**Inspiration:** "${config.inspiration}"`,
    `**Current model:** ${config.model}`,
    "",
    "## CRITICAL — URL TARGETING RULES",
    "",
    `You are reviewing the application at **${config.appUrl}** — this is the ONLY URL you should navigate to in a browser.`,
    "",
    "**DO NOT** navigate to localhost:3000 unless that is the target app URL above.",
    "**DO NOT** interact with the Endstate Dashboard — that is the orchestration tool managing you, not the app under review.",
    "**DO NOT** create, modify, or read files outside the target project path above.",
    `**DO** use \`${config.appUrl}\` for all browser navigation, health checks, and API testing.`,
    `**DO** use \`${config.projectPath}\` as the root for all filesystem operations.`,
    "",
    "If the target app URL is not responding, create a CRITICAL task and stop. Do NOT fall back to browsing other URLs.",
  ].join("\n");

  // Inject cheat sheet for all agents except the Researcher (who produces it)
  let cheatSheetSection = "";
  if (role !== AGENT_ROLES.RESEARCHER) {
    const cheatSheet = getCheatSheet(config.projectPath);
    if (cheatSheet) {
      cheatSheetSection = [
        "",
        "## RESEARCHER CHEAT SHEET",
        "",
        "The following project overview was produced by the Researcher agent. Use this as your primary reference instead of re-exploring the project from scratch.",
        "",
        cheatSheet,
      ].join("\n");
    }
  }

  return [basePrompt, agentPrompt, context, cheatSheetSection].filter(Boolean).join("\n\n---\n\n");
}

// ─── MCP server configs per role ──────────────────────────────────────────────

function mcpPlaywright(projectPath: string) {
  // Route screenshots to .projects/<slug>/screenshots/ so artifacts
  // land in the correct project folder instead of the Endstate cwd.
  const screenshotsDir = projectScreenshotsDir(projectPath);
  return {
    type: "local" as const,
    command: "npx",
    args: ["@playwright/mcp@latest", "--output-dir", screenshotsDir],
    tools: ["*"],
  };
}

function mcpFilesystem(projectPath: string) {
  return {
    type: "local" as const,
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", projectPath],
    tools: ["*"],
  };
}

const MCP_GITHUB = {
  type: "local" as const,
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  tools: ["*"],
};

function mcpServersForRole(
  role: AgentRole,
  projectPath: string
): Record<string, { type: "local"; command: string; args: string[]; tools: string[] }> {
  // Domain-scoped roles: analyst-* gets filesystem, fixer-* gets filesystem + github
  if (isAnalystRole(role)) {
    return { fs: mcpFilesystem(projectPath) };
  }
  if (isFixerRole(role)) {
    return { fs: mcpFilesystem(projectPath), github: MCP_GITHUB };
  }

  // Base roles and special roles
  switch (role) {
    case AGENT_ROLES.RESEARCHER:
    case AGENT_ROLES.ANALYST:
      return { fs: mcpFilesystem(projectPath) };

    case AGENT_ROLES.EXPLORER:
    case AGENT_ROLES.UX_REVIEWER:
      return { fs: mcpFilesystem(projectPath), playwright: mcpPlaywright(projectPath) };

    case AGENT_ROLES.FIXER:
    case AGENT_ROLES.CODE_SIMPLIFIER:
      return { fs: mcpFilesystem(projectPath), github: MCP_GITHUB };

    case AGENT_ROLES.CONSOLIDATOR:
      return { fs: mcpFilesystem(projectPath), github: MCP_GITHUB, playwright: mcpPlaywright(projectPath) };

    default:
      return { fs: mcpFilesystem(projectPath) };
  }
}

// ─── Tool overrides ───────────────────────────────────────────────────────────

function buildToolLists(config: PipelineConfig): {
  excludedTools?: string[];
} {
  const overrides = config.toolOverrides;
  if (!overrides || overrides.length === 0) return {};

  const excluded = overrides.filter((t) => !t.enabled).map((t) => t.name);
  if (excluded.length === 0) return {};

  return { excludedTools: excluded };
}

// ─── Session hooks ────────────────────────────────────────────────────────────

// Track OTel spans across pre/post hooks without mutating hook inputs
const spanMap = new WeakMap<object, ReturnType<typeof startToolSpan>>();

function buildHooks(): NonNullable<SessionConfig["hooks"]> {
  return {
    onPreToolUse: async (input, _invocation) => {
      const span = startToolSpan(input.toolName, "");
      recordToolInvocation(input.toolName);
      spanMap.set(input, span);
      return { permissionDecision: "allow" as const };
    },
    onPostToolUse: async (input, _invocation) => {
      const span = spanMap.get(input);
      if (span) {
        endSpanOk(span);
        spanMap.delete(input);
      }
    },
    onUserPromptSubmitted: async (input, _invocation) => {
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
  config: PipelineConfig,
  overrides?: { workingDirectory?: string; configDir?: string },
) {
  const client = await getClient();
  const systemPrompt = loadSystemPrompt(role, config);

  // Use worktree path if provided, otherwise use the main project path
  const effectivePath = overrides?.workingDirectory ?? config.projectPath;

  // Resolve MCP servers: default per role, merged with user overrides
  const defaultMcps = mcpServersForRole(role, effectivePath);
  const mcpServers = getMcpServersForAgent(
    role,
    defaultMcps,
    config.mcpServerOverrides ?? []
  );

  // Resolve skill directories for this agent
  const skillDirectories = getSkillDirectoriesForAgent(
    role,
    config.skills ?? []
  );

  // Resolve custom agents
  const customAgents = (config.customAgentDefinitions ?? [])
    .filter((a) => a.enabled)
    .map(({ name, displayName, description, prompt }) => ({
      name,
      displayName,
      description,
      prompt,
    }));

  // Resolve tool overrides
  const toolLists = buildToolLists(config);

  // Ensure .agentic output directory exists inside the effective project path
  const agenticDir = overrides?.configDir ?? path.join(effectivePath, ".agentic");
  if (!fs.existsSync(agenticDir)) {
    fs.mkdirSync(agenticDir, { recursive: true });
  }

  const sessionConfig: Parameters<typeof client.createSession>[0] = {
    clientName: "endstate",
    model: config.model,
    streaming: true,
    systemMessage: { mode: "replace", content: systemPrompt },
    tools: agentTools,
    mcpServers,
    workingDirectory: effectivePath,
    configDir: agenticDir,
    infiniteSessions: {
      enabled: config.infiniteSessions,
      backgroundCompactionThreshold: 0.75,
      bufferExhaustionThreshold: 0.9,
    },
    onPermissionRequest: approveAll,
    hooks: buildHooks(),
    ...(skillDirectories.length > 0 && { skillDirectories }),
    ...(customAgents.length > 0 && { customAgents }),
    ...(toolLists.excludedTools && { excludedTools: toolLists.excludedTools }),
    ...(config.reasoningEffort && { reasoningEffort: config.reasoningEffort }),
  };

  return client.createSession(sessionConfig);
}
