import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { PipelineConfig } from "@/lib/types";
import { SEVERITIES } from "@/lib/types";

const CONFIG_FILENAME = ".agentic-dev.json";

const PipelineConfigSchema = z.object({
  projectPath: z.string().min(1),
  appUrl: z.string().url(),
  inspiration: z.string().min(1),
  maxCycles: z.number().int().min(1).max(50),
  model: z.string().min(1),
  autoApprove: z.boolean(),
  infiniteSessions: z.boolean(),
  fixSeverity: z.enum([
    SEVERITIES.CRITICAL,
    SEVERITIES.HIGH,
    SEVERITIES.MEDIUM,
    SEVERITIES.LOW,
  ]),
  enableExplorer: z.boolean(),
  enableAnalyst: z.boolean(),
  enableFixer: z.boolean(),
  enableUxReviewer: z.boolean(),
});

function configPath(projectPath?: string): string {
  const base = projectPath ?? process.cwd();
  return path.join(base, CONFIG_FILENAME);
}

function loadConfig(projectPath?: string): PipelineConfig | null {
  const fp = configPath(projectPath);
  if (!fs.existsSync(fp)) return null;
  try {
    const raw = fs.readFileSync(fp, "utf-8");
    return JSON.parse(raw) as PipelineConfig;
  } catch {
    return null;
  }
}

function saveConfig(config: PipelineConfig): void {
  const fp = configPath(config.projectPath);
  fs.writeFileSync(fp, JSON.stringify(config, null, 2), "utf-8");
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
