import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { detectProjectSkills } from "@/lib/pipeline/skill-manager";
import { detectProjectMcpServers } from "@/lib/pipeline/mcp-manager";
import {
  projectConfigPath,
  ensureProjectDir,
} from "@/lib/pipeline/project-resolver";
import {
  SkillDefinitionSchema,
  CustomAgentDefinitionSchema,
  McpServerEntrySchema,
  ToolEntrySchema,
} from "@/lib/schemas";
import type {
  SkillDefinition,
  CustomAgentDefinition,
  McpServerEntry,
  ToolEntry,
} from "@/lib/types";

const CONFIG_FILENAME = ".agentic-dev.json";

interface CustomizationState {
  skills: SkillDefinition[];
  customAgentDefinitions: CustomAgentDefinition[];
  mcpServerOverrides: McpServerEntry[];
  toolOverrides: ToolEntry[];
}

const CustomizationSaveSchema = z.object({
  projectPath: z.string().min(1),
  skills: z.array(SkillDefinitionSchema).optional(),
  customAgentDefinitions: z.array(CustomAgentDefinitionSchema).optional(),
  mcpServerOverrides: z.array(McpServerEntrySchema).optional(),
  toolOverrides: z.array(ToolEntrySchema).optional(),
});

function loadConfigFile(
  projectPath: string
): Record<string, unknown> | null {
  // Prefer .projects/<slug>/config.json, fall back to target project's .agentic-dev.json
  const localCopy = projectConfigPath(projectPath);
  if (fs.existsSync(localCopy)) {
    try {
      return JSON.parse(fs.readFileSync(localCopy, "utf-8")) as Record<string, unknown>;
    } catch { /* fall through */ }
  }
  const fp = path.join(projectPath, CONFIG_FILENAME);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, "utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function saveConfigFile(
  projectPath: string,
  config: Record<string, unknown>
): void {
  // Write to .projects/<slug>/config.json
  ensureProjectDir(projectPath);
  const localCopy = projectConfigPath(projectPath);
  fs.writeFileSync(localCopy, JSON.stringify(config, null, 2), "utf-8");

  // Also write to target project's .agentic-dev.json
  const fp = path.join(projectPath, CONFIG_FILENAME);
  fs.writeFileSync(fp, JSON.stringify(config, null, 2), "utf-8");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectPath = searchParams.get("projectPath");

  if (!projectPath) {
    return NextResponse.json(
      { error: "projectPath query parameter is required" },
      { status: 400 }
    );
  }

  const skills = detectProjectSkills(projectPath);
  const detectedMcpServers = detectProjectMcpServers(projectPath);

  // Load any saved customization state from config
  const config = loadConfigFile(projectPath);

  const state: CustomizationState = {
    skills: (config?.skills as SkillDefinition[] | undefined) ?? skills,
    customAgentDefinitions:
      (config?.customAgentDefinitions as CustomAgentDefinition[] | undefined) ??
      [],
    mcpServerOverrides:
      (config?.mcpServerOverrides as McpServerEntry[] | undefined) ?? [],
    toolOverrides:
      (config?.toolOverrides as ToolEntry[] | undefined) ?? [],
  };

  return NextResponse.json(
    { ...state, detectedMcpServers },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = CustomizationSaveSchema.parse(body);

    const existing = loadConfigFile(parsed.projectPath) ?? {};

    // Merge customization fields into existing config
    if (parsed.skills !== undefined) existing.skills = parsed.skills;
    if (parsed.customAgentDefinitions !== undefined)
      existing.customAgentDefinitions = parsed.customAgentDefinitions;
    if (parsed.mcpServerOverrides !== undefined)
      existing.mcpServerOverrides = parsed.mcpServerOverrides;
    if (parsed.toolOverrides !== undefined)
      existing.toolOverrides = parsed.toolOverrides;

    saveConfigFile(parsed.projectPath, existing);

    return NextResponse.json(
      { message: "Customizations saved" },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid customization data", details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
