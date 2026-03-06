import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { PipelineConfig } from "@/lib/types";
import { PipelineConfigSchema } from "@/lib/schemas";
import {
  projectConfigPath,
  ensureProjectDir,
  setActiveProject,
  getActiveProjectPath,
  migrateFromLegacy,
} from "@/lib/pipeline/project-resolver";

const TARGET_CONFIG_FILENAME = ".agentic-dev.json";

function loadConfig(projectPath?: string): PipelineConfig | null {
  // Try explicit project path → .projects/<slug>/config.json
  if (projectPath) {
    const localCopy = projectConfigPath(projectPath);
    if (fs.existsSync(localCopy)) {
      try {
        return JSON.parse(fs.readFileSync(localCopy, "utf-8")) as PipelineConfig;
      } catch { /* fall through */ }
    }
    // Fall back to target project's own copy
    const targetFp = path.join(projectPath, TARGET_CONFIG_FILENAME);
    if (fs.existsSync(targetFp)) {
      try {
        return JSON.parse(fs.readFileSync(targetFp, "utf-8")) as PipelineConfig;
      } catch { /* fall through */ }
    }
  }

  // No explicit path — resolve from active project
  const activePath = getActiveProjectPath();
  if (activePath) {
    const localCopy = projectConfigPath(activePath);
    if (fs.existsSync(localCopy)) {
      try {
        return JSON.parse(fs.readFileSync(localCopy, "utf-8")) as PipelineConfig;
      } catch { /* fall through */ }
    }
  }

  // Legacy fallback: root .agentic-dev.json (triggers migration)
  const legacyFp = path.join(process.cwd(), TARGET_CONFIG_FILENAME);
  if (fs.existsSync(legacyFp)) {
    migrateFromLegacy();
    // After migration, try the new location
    const migratedPath = getActiveProjectPath();
    if (migratedPath) {
      const localCopy = projectConfigPath(migratedPath);
      if (fs.existsSync(localCopy)) {
        try {
          return JSON.parse(fs.readFileSync(localCopy, "utf-8")) as PipelineConfig;
        } catch { /* fall through */ }
      }
    }
    // If migration didn't work, read legacy directly
    try {
      return JSON.parse(fs.readFileSync(legacyFp, "utf-8")) as PipelineConfig;
    } catch { /* fall through */ }
  }

  return null;
}

function saveConfig(config: PipelineConfig): void {
  // Write to .projects/<slug>/config.json
  ensureProjectDir(config.projectPath);
  const localCopy = projectConfigPath(config.projectPath);
  fs.writeFileSync(localCopy, JSON.stringify(config, null, 2), "utf-8");

  // Update active project pointer
  setActiveProject(config.projectPath);

  // Also write .agentic-dev.json in the TARGET project directory
  const targetFp = path.join(config.projectPath, TARGET_CONFIG_FILENAME);
  fs.writeFileSync(targetFp, JSON.stringify(config, null, 2), "utf-8");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectPath = searchParams.get("projectPath") ?? undefined;

  const config = loadConfig(projectPath);
  if (!config) {
    return NextResponse.json(
      { config: null, message: "No config found" },
      { status: 200 }
    );
  }

  return NextResponse.json({ config }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const config = PipelineConfigSchema.parse(body);

    saveConfig(config);

    return NextResponse.json(
      { config, message: "Config saved" },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid config", details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
