import { NextResponse } from "next/server";
import { z } from "zod";
import { startPipeline, getPipelineState } from "@/lib/pipeline/orchestrator";
import { SEVERITIES } from "@/lib/types";

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

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const config = PipelineConfigSchema.parse(body);

    const state = getPipelineState();
    if (state.status === "running") {
      return NextResponse.json(
        { error: "Pipeline is already running" },
        { status: 409 }
      );
    }

    const runId = startPipeline(config);

    return NextResponse.json({ runId, status: "started" }, { status: 200 });
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
