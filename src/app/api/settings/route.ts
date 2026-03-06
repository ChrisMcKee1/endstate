import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { PipelineConfig } from "@/lib/types";
import { PipelineConfigSchema } from "@/lib/schemas";

const CONFIG_FILENAME = ".agentic-dev.json";
const LOCAL_CONFIG = path.join(process.cwd(), CONFIG_FILENAME);

function configPath(projectPath?: string): string {
  const base = projectPath ?? process.cwd();
  return path.join(base, CONFIG_FILENAME);
}

function loadConfig(projectPath?: string): PipelineConfig | null {
  // Try the explicit project path first
  if (projectPath) {
    const fp = configPath(projectPath);
    if (fs.existsSync(fp)) {
      try {
        return JSON.parse(fs.readFileSync(fp, "utf-8")) as PipelineConfig;
      } catch { /* fall through */ }
    }
  }

  // Fall back to the local config (always written alongside the project config)
  if (fs.existsSync(LOCAL_CONFIG)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_CONFIG, "utf-8")) as PipelineConfig;
    } catch { /* fall through */ }
  }

  return null;
}

function saveConfig(config: PipelineConfig): void {
  // Save in the target project directory
  const projectFp = configPath(config.projectPath);
  fs.writeFileSync(projectFp, JSON.stringify(config, null, 2), "utf-8");

  // Also save locally so the dashboard can find it without knowing the project path
  if (projectFp !== LOCAL_CONFIG) {
    fs.writeFileSync(LOCAL_CONFIG, JSON.stringify(config, null, 2), "utf-8");
  }
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
