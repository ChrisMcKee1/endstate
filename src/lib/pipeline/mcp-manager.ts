import fs from "node:fs";
import path from "node:path";
import type { AgentRole, McpServerEntry } from "@/lib/types";
import { MCP_SERVER_TYPES, AGENT_ROLES } from "@/lib/types";

const ALL_ROLES: AgentRole[] = Object.values(AGENT_ROLES);

// ─── MCP config file structures ──────────────────────────────────────────────

interface McpJsonServerConfig {
  type?: "stdio" | "http";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
  tools?: string[];
}

interface McpJsonFile {
  servers?: Record<string, McpJsonServerConfig>;
}

// ─── Detect MCP servers from project config files ─────────────────────────────

const MCP_CONFIG_PATHS = [
  ".vscode/mcp.json",
  ".copilot/mcp.json",
] as const;

function parseConfigFile(filePath: string): McpServerEntry[] {
  if (!fs.existsSync(filePath)) return [];

  let parsed: McpJsonFile;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    parsed = JSON.parse(raw) as McpJsonFile;
  } catch {
    return [];
  }

  if (!parsed.servers || typeof parsed.servers !== "object") return [];

  const entries: McpServerEntry[] = [];

  for (const [id, config] of Object.entries(parsed.servers)) {
    const serverType = config.type === "http" ? MCP_SERVER_TYPES.HTTP : MCP_SERVER_TYPES.STDIO;

    entries.push({
      id,
      name: id,
      type: serverType,
      command: config.command,
      args: config.args,
      url: config.url,
      env: config.env,
      headers: config.headers,
      tools: config.tools ?? ["*"],
      enabled: true,
      assignedAgents: [...ALL_ROLES],
    });
  }

  return entries;
}

export function detectProjectMcpServers(projectPath: string): McpServerEntry[] {
  const servers: McpServerEntry[] = [];
  const seen = new Set<string>();

  for (const relPath of MCP_CONFIG_PATHS) {
    const absPath = path.join(projectPath, relPath);
    for (const server of parseConfigFile(absPath)) {
      if (!seen.has(server.id)) {
        seen.add(server.id);
        servers.push(server);
      }
    }
  }

  return servers;
}

// ─── Merge defaults with overrides per agent ──────────────────────────────────

interface McpStdioConfig {
  type: "local" | "stdio";
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  tools: string[];
}

interface McpHttpConfig {
  type: "http";
  url: string;
  headers?: Record<string, string>;
  tools: string[];
}

type McpConfig = McpStdioConfig | McpHttpConfig;

function entryToSdkConfig(entry: McpServerEntry): McpConfig | null {
  if (entry.type === MCP_SERVER_TYPES.STDIO) {
    if (!entry.command) return null;
    return {
      type: "local" as const,
      command: entry.command,
      args: entry.args ?? [],
      ...(entry.env && Object.keys(entry.env).length > 0 ? { env: entry.env } : {}),
      tools: entry.tools ?? ["*"],
    };
  }

  if (!entry.url) return null;
  return {
    type: "http",
    url: entry.url,
    ...(entry.headers && Object.keys(entry.headers).length > 0 ? { headers: entry.headers } : {}),
    tools: entry.tools ?? ["*"],
  };
}

export function getMcpServersForAgent(
  role: AgentRole,
  defaults: Record<string, McpConfig>,
  overrides: McpServerEntry[]
): Record<string, McpConfig> {
  const result: Record<string, McpConfig> = { ...defaults };

  // Collect overrides that disable a default server
  const disabledIds = new Set<string>();

  for (const entry of overrides) {
    // Skip servers not assigned to this agent (unless assignedAgents is empty = all agents)
    if (entry.assignedAgents.length > 0 && !entry.assignedAgents.includes(role))
      continue;

    if (!entry.enabled) {
      disabledIds.add(entry.id);
      continue;
    }

    const config = entryToSdkConfig(entry);
    if (config) {
      result[entry.id] = config;
    }
  }

  // Remove disabled servers
  for (const id of disabledIds) {
    delete result[id];
  }

  return result;
}
